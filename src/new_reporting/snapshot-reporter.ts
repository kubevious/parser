import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { DiffItem, Snapshot } from './snapshot'

import VERSION from '../version'
import { ReporterTarget } from './reporter-target';
import { SnapshotItem } from './snapshot-item';

export class SnapshotReporter
{
    private _logger: ILogger;
    private _reporterTarget : ReporterTarget;

    private _snapshot: Snapshot;
    private _latestSnapshot: Snapshot | null;
    private _snapshotId: string | null;

    private _isReported = false;
    private _diffId : any;

    constructor(reporterTarget: ReporterTarget, logger: ILogger, snapshot: Snapshot, latestSnapshot: Snapshot | null, latestSnapshotId: string | null)
    {
        this._reporterTarget = reporterTarget;
        this._logger = logger;

        this._snapshot = snapshot;
        this._latestSnapshot = latestSnapshot;
        this._snapshotId = latestSnapshotId;

        this._isReported = false;
        this._diffId = null;
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
        return this._execute();
    }

    private _execute() : Promise<any>
    {
        this.logger.info("[_execute]");
        return Promise.resolve()
            .then(() => {
                if (this._isReported)
                {
                    return;
                }

                return Promise.resolve()
                    .then(() => this._createSnapshot())
                    .then(() => this._publishSnapshotItems())
                    .then(() => this._activateSnapshot())
                    .then(() => this._execute())
                    ;
                    
                // if (this._snapshotId)
                // {
                //     return this._reportAsDiff();
                // }
                // else
                // {
                //     return this._reportAsSnapshot();
                // }
            });
    }

    // private _reportAsSnapshot() : Promise<any>
    // {
    //     this.logger.info("[_reportAsSnapshot]");
    //     return Promise.resolve()
    //         .then(() => this._createSnapshot())
    //         .then(() => this._publishSnapshotItems())
    //         .then(() => this._activateSnapshot())
    //         .then(() => this._execute())
    //         ;
    // }

    private _createSnapshot() : Promise<any>
    {
        this.logger.info("[_createSnapshot]");
        let body : CreateSnapshotBody = {
            version: VERSION,
            date: this._snapshot.date.toISOString()
        }

        if (this._snapshotId) {
            body.snapshot_id = this._snapshotId;
        }

        return this._request('/snapshot', body)
            .then((result : any) => {
                this._snapshotId = result.id;
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

    private _publishSnapshotChunks(items : DiffItem[]) : Promise<any> | void
    {
        if (!this._snapshotId) {
            return;
        }

        this.logger.info("[_publishSnapshotChunks] count: %s", items.length);

        const data = {
            snapshot_id: this._snapshotId,
            items: items
        }
        return this._request('/snapshot/items', data)
            .then((result : any) => {
                this.logger.silly("[_publishSnapshotChunks] result: ", result);

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

        var data = {
            snapshot_id: this._snapshotId
        }
        return this._request('/snapshot/activate', data)
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

    // private _reportAsDiff()
    // {
    //     this.logger.info("[_reportAsDiff]");
    //     return Promise.resolve()
    //         .then(() => this._createDiff())
    //         .then(() => this._publishDiffItems())
    //         .then(() => this._activateDiff())
    //         .then(() => this._execute())
    // }

    // private _createDiff() : Promise<any> | void
    // {
    //     if (!this._snapshotId) {
    //         return;
    //     }
    //     this.logger.info("[_createDiff]");

    //     var body = {
    //         date: this._snapshot.date.toISOString(),
    //         snapshot_id: this._snapshotId
    //     }
    //     return this._request('/diff', body)
    //         .then((result : any) => {
    //             this.logger.info("[_createDiff] result: ", result);

    //             if (result.new_snapshot) {
    //                 this.logger.info("[_createDiff] resetting snapshot.");
    //                 this._snapshotId = null;
    //             } else {
    //                 this._diffId = result.id;
    //                 this.logger.info("[_createDiff] new diff: %s", this._diffId);
    //             }
    //         })
    // }

    // private _publishDiffItems() : Promise<any> | void
    // {
    //     if (!this._snapshotId) {
    //         return;
    //     }
    //     if (!this._diffId) {
    //         return;
    //     }

    //     this.logger.info("[_publishSnapshotItems]");
    //     const reportableItems = this._snapshot.extractDiff(this._latestSnapshot!);
    //     const itemChunks = _.chunk(reportableItems, 10);
    //     return Promise.serial(itemChunks, this._publishDiffChunks.bind(this));
    // }

    // private _publishDiffChunks(items : DiffItem[]) : Promise<any> | void
    // {
    //     if (!this._snapshotId) {
    //         return;
    //     }
    //     if (!this._diffId) {
    //         return;
    //     }

    //     this.logger.verbose("[_publishDiffChunks] count: %s", items.length);

    //     var data = {
    //         diff_id: this._diffId,
    //         items: items
    //     }
    //     return this._request('/diff/items', data)
    //         .then((result : any) => {
    //             this.logger.silly("[_publishDiffItem] result: ", result);

    //             if (result.new_snapshot) {
    //                 this.logger.info("[_publishDiffItem] resetting snapshot.");
    //                 this._snapshotId = null;
    //                 return
    //             }

    //             if (result.needed_configs && result.needed_configs.length > 0)
    //             {
    //                 return this._publishNeededConfigs(result.needed_configs);
    //             }
    //         });
    // }

    // private _activateDiff() : Promise<any> | void
    // {
    //     if (!this._snapshotId) {
    //         return;
    //     }
    //     if (!this._diffId) {
    //         return;
    //     }

    //     this.logger.info("[_activateDiff]");

    //     var data = {
    //         diff_id: this._diffId
    //     }
    //     return this._request('/diff/activate', data)
    //         .then((result : any) => {
    //             this.logger.info("[_activateDiff] result: ", result);

    //             if (result.new_snapshot) {
    //                 this.logger.info("[_activateDiff] resetting snapshot.");
    //                 this._snapshotId = null;
    //                 this._diffId = null;
    //             } else {
    //                 this._snapshotId = result.id;
    //                 this._isReported = true;
    //                 this.logger.info("[_activateDiff] activated: %s. new snapshot id: %s.", this._diffId, this._snapshotId);
    //             }
    //         });
    // }

    private _publishNeededConfigs(configHashes : string[])
    {
        this.logger.info("[_publishNeededConfigs] count: %s", configHashes.length);

        return Promise.serial(configHashes, hash => {
            const item = this._snapshot.getByConfigHash(hash)!;
            const data = {
                configHash: hash,
                config: item.config
            }
            return this._request('/config', data)
        });
    }


    private _request(url : string, data : any)
    {
        this.logger.verbose("[_request] url: %s", url);
        this.logger.silly("[_request] url: %s, data: ", url, data);
        return this._reporterTarget.request(url, data);
    }
}

interface CreateSnapshotBody {
    version: string,
    date: string,
    snapshot_id? : string
}
