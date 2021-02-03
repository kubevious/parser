import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';
import { ReportableSnapshotItem, RequestReportSnapshot, ResponseReportSnapshot, RequestReportSnapshotItems, ResponseReportSnapshotItems, RequestActivateSnapshot, ResponseActivateSnapshot } from '@kubevious/helpers/dist/reportable/types'

import { Snapshot } from './snapshot'

import VERSION from '../version'
import { ReporterTarget } from './reporter-target';
import { HandledError } from '@kubevious/helpers/dist/handled-error';

export class SnapshotReporter
{
    private _logger: ILogger;
    private _reporterTarget : ReporterTarget;

    private _snapshot: Snapshot;
    private _latestSnapshot: Snapshot | null;
    private _snapshotId: string | null;

    private _isReported = false;

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

        let body : RequestReportSnapshot = {
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
                }

                if (result!.delay)
                {
                    throw new HandledError('Delaying snapshot reporting');
                }

                if (result!.new_snapshot)
                {
                    this.logger.info("[_createSnapshot] resetting snapshot.");
                    this._snapshotId = null;
                    return;
                }

                this._snapshotId = result!.id!;
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
        const itemChunks = _.chunk(reportableItems, 10);

        return Promise.serial(itemChunks, this._publishSnapshotChunks.bind(this));
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
            .then((result : any) => {
                this.logger.info("[_activateSnapshot] result: ", result);

                if (result.new_snapshot) {
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

        return Promise.serial(configHashes, hash => {

            const item = this._snapshot.getByConfigHash(hash)!;

            const data = {
                hash: hash,
                config: item.config
            }
            return this._request('/config', data)
        });
    }

    private _request<TRequest, TResponse>(url : string, data : TRequest)
    {
        this.logger.verbose("[_request] url: %s", url);
        this.logger.silly("[_request] url: %s, data: ", url, data);
        return this._reporterTarget.request<TRequest, TResponse>(url, data);
    }
}
