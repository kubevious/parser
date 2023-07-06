import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { RequestReportSnapshot, ResponseReportSnapshot, ReportableSnapshotItem } from '@kubevious/agent-middleware';
import { RequestReportSnapshotItems, ResponseReportSnapshotItems } from '@kubevious/agent-middleware';
import { ReportableDataItem } from '@kubevious/agent-middleware';
import { RequestActivateSnapshot, ResponseActivateSnapshot } from '@kubevious/agent-middleware';

import { Snapshot } from './snapshot'

import VERSION from '../version'
import { ReporterTarget } from './reporter-target';
import { HandledError } from '@kubevious/helpers/dist/handled-error';
import * as ZipUtils from '@kubevious/helpers/dist/zip-utils';
import { SnapshotItem } from './snapshot-item';
import { MyPromise } from 'the-promise';

export class SnapshotReporter
{
    private _logger: ILogger;
    private _reporterTarget : ReporterTarget;

    private _snapshot: Snapshot;
    private _latestSnapshot: Snapshot | null;
    private _snapshotId: string | null;

    private _isReported = false;

    private _itemBulkSize : number = 10;
    private _config_reporter_count : number = 1;
    private _config_reporter_size : number = 2 * 1024 * 1024; // 2 MB
    private _config_reporter_compression : boolean = false;

    constructor(reporterTarget: ReporterTarget, logger: ILogger, snapshot: Snapshot, latestSnapshot: Snapshot | null, latestSnapshotId: string | null)
    {
        this._reporterTarget = reporterTarget;
        this._logger = logger;

        this._snapshot = snapshot;
        this._latestSnapshot = latestSnapshot;
        this._snapshotId = latestSnapshotId;

        this._isReported = false;
    }

    get logger() {
        return this._logger;
    }

    get isReported() {
        return this._isReported;
    }

    get snapshotId() {
        return this._snapshotId;
    }

    run()
    {
        this._logger.info("[run] ");

        return Promise.resolve()
            .then(() => this._createSnapshot())
            .then(() => this._publishSnapshotItems())
            .then(() => this._activateSnapshot())
            ;
    }

    private _createSnapshot() : Promise<any>
    {
        this.logger.info("[_createSnapshot]");

        const body : RequestReportSnapshot = {
            version: VERSION,
            date: this._snapshot.date.toISOString()
        }

        if (this._snapshotId) {
            body.snapshot_id = this._snapshotId;
        }

        return this._request<RequestReportSnapshot, ResponseReportSnapshot>('/snapshot', body)
            .then((result) => {
                if (!result)
                {
                    throw new HandledError('No response');
                    return;
                }

                this.logger.info("[_createSnapshot] response:", result);

                if (result.delay)
                {
                    const timeout = result.delaySeconds! || 5;
                    this.logger.info("[_createSnapshot] postponing reporting for %s seconds.", timeout);
                    return MyPromise.delay(timeout * 1000)
                        .then(() => {
                            throw new HandledError('Delaying snapshot reporting');
                        })
                }

                if (result.new_snapshot)
                {
                    this.logger.info("[_createSnapshot] resetting snapshot.");
                    this._snapshotId = null;
                    return;
                }

                if (result.item_reporter_count) {
                    this._itemBulkSize = result.item_reporter_count;
                }

                if (result.config_reporter_count) {
                    this._config_reporter_count = result.config_reporter_count;
                }

                if (result.config_reporter_size_kb) {
                    this._config_reporter_size = result.config_reporter_size_kb * 1024;
                }

                if (result.config_reporter_compression) {
                    this._config_reporter_compression = true;
                }

                this._snapshotId = result.id!;
                this.logger.info("[_createSnapshot] id: %s", this._snapshotId);
            })
    }

    private _publishSnapshotItems() : Promise<any> | void
    {
        if (!this._snapshotId) {
            return;
        }

        this.logger.info("[_publishSnapshotItems]");

        const reportableItems = this._snapshot.extractDiff(this._latestSnapshot!);
        const itemChunks = _.chunk(reportableItems, this._itemBulkSize);

        return MyPromise.serial(itemChunks, this._publishSnapshotChunks.bind(this));
    }

    private _publishSnapshotChunks(items : ReportableSnapshotItem[]) : Promise<any> | void
    {
        if (!this._snapshotId) {
            return;
        }

        this.logger.info("[_publishSnapshotChunks] count: %s", items.length);

        const body : RequestReportSnapshotItems = {
            snapshot_id: this._snapshotId,
            items: items
        }

        return this._request<RequestReportSnapshotItems, ResponseReportSnapshotItems>('/snapshot/items', body)
            .then((result) => {
                if(!result) {
                    return;
                }

                if (result.new_snapshot) {
                    this.logger.info("[_publishSnapshotItem] resetting snapshot.");
                    this._snapshotId = null;
                    return;
                }

                if (result.needed_configs && result.needed_configs.length > 0)
                {
                    return this._publishNeededConfigs(result.needed_configs);
                }
            });
    }

    private _activateSnapshot() : Promise<any> | void
    {
        if (!this._snapshotId) {
            return;
        }

        this.logger.info("[_activateSnapshot]");

        const data : RequestActivateSnapshot = {
            snapshot_id: this._snapshotId
        }
        return this._request<RequestActivateSnapshot, ResponseActivateSnapshot>('/snapshot/activate', data)
            .then((result) => {
                if (!result)
                {
                    throw new HandledError('No response');
                }
                
                this.logger.info("[_activateSnapshot] result: ", result);

                if (result!.new_snapshot) {
                    this.logger.info("[_activateSnapshot] resetting snapshot.");
                    this._snapshotId = null;
                } else {
                    this.logger.info("[_activateSnapshot] activated: %s", this._snapshotId);
                    this._isReported = true;
                }
            });
    }

    private _publishNeededConfigs(configHashes : string[])
    {
        // this.logger.info("[_publishNeededConfigs] count: %s", configHashes.length);
        
        const items : SnapshotItem[] = []
        for(const hash of configHashes)
        {
            const item = this._snapshot.getByConfigHash(hash)!;
            items.push(item);
        }

        if (this._config_reporter_compression)
        {
            let currentCount = 0;
            let currentSize = 0;

            const chunks : ReportableDataChunk[] = [];
            let currentChunk : ReportableDataChunk | null = null;

            return MyPromise.serial(items, item => {
                return ZipUtils.compressObj(item.config)
                    .then(dataStr => {
                        if (!currentChunk ||
                            (dataStr.length + currentSize > this._config_reporter_size) || 
                            (currentCount + 1 > this._config_reporter_count))
                        {
                            currentCount = 0;
                            currentSize = 0;
                            currentChunk = null;
                        }

                        if (!currentChunk) {
                            currentChunk = []
                            chunks.push(currentChunk);
                        }
                        currentChunk.push({ hash: item.configHash, data: dataStr });
                        currentCount++;
                        currentSize += dataStr.length;
                    });
            })
            .then(() => {
                return MyPromise.serial(chunks, chunk => {
                    const data = {
                        chunks: chunk
                    }
                    return this._request('/report_chunks', data);
                });
            });

        }
        else
        {
            return MyPromise.serial(items, item => {
                this._publishSingleObject(item.configHash, item.config);
            });
        }
    }

    private _publishSingleObject(hash: string, config: any)
    {
        // this.logger.info("[_publishSingleObject]");
        const data = {
            hash: hash,
            config: config
        }
        return this._request('/config', data)
    }

    private _request<TRequest, TResponse>(url : string, data : TRequest)
    {
        this.logger.verbose("[_request] url: %s", url);
        this.logger.silly("[_request] url: %s, data: ", url, data);
        return this._reporterTarget.request<TRequest, TResponse>(url, data);
    }
}

type ReportableDataChunk = ReportableDataItem[];
