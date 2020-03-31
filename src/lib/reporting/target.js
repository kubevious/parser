const Promise = require('the-promise');
const _ = require('lodash');
const JobDampener = require('../utils/job-dampener');
const SnapshotReporter = require('./snapshot-reporter');
const axios = require('axios');

class ReporterTarget
{
    constructor(logger, collector)
    {
        this._logger = logger.sublogger("ReporterTarget");
        this._snapshotLogger = logger.sublogger("SnapshotReporter");

        this._baseUrl = collector.url;
        this._axios = axios.create({
            baseURL: this._baseUrl,
            timeout: 1000,
        });

        this._jobDampener = new JobDampener(this._logger.sublogger("ReporterDampener"), this._processSnapshot.bind(this));

        this._latestSnapshot = null;
        this._latestSnapshotId = null;
    }

    get logger() {
        return this._logger;
    }

    report(snapshot)
    {
        this._logger.info("[report] date: %s, item count: %s", snapshot.date.toISOString(), snapshot.count);
        this._jobDampener.acceptJob(snapshot.date, snapshot);
    }

    _processSnapshot(date, snapshot)
    {
        this._logger.info("[_processSnapshot] date: %s, item count: %s", date.toISOString(), snapshot.count);
        return this._reportSnapshot(snapshot);
    }

    _reportSnapshot(snapshot)
    {
        this._logger.info("[_reportSnapshot] Begin");

        var snapshotReporter = new SnapshotReporter(this, this._snapshotLogger, snapshot, this._latestSnapshot, this._latestSnapshotId);
        return snapshotReporter.run()
            .then(() => {
                this._logger.info("[_reportSnapshot] Finished");

                if (snapshotReporter.isReported) {
                    this._latestSnapshot = snapshot;
                    this._latestSnapshotId = snapshotReporter.snapshotId;

                    this._logger.info("[_reportSnapshot] Completed. Latest Snapshot Id:", this._latestSnapshotId);
                } else {
                    this._latestSnapshot = null;
                    this._latestSnapshotId = null;

                    this._logger.warn("[_reportSnapshot] Failed to report. Will retry.");

                    return this._retrySnapshotReport(snapshot);
                }
            })
    }

    _retrySnapshotReport(snapshot)
    {
        return Promise.timeout(3000)
            .then(() => this._reportSnapshot(snapshot));
    }

    request(url, data)
    {
        this.logger.verbose("[request] url: %s%s", this._baseUrl, url);
        this.logger.silly("[request] url: %s%s, data: ", this._baseUrl, url, data);
        return this._axios.post(url, data)
            .then(res => {
                return res.data;
            })
            .catch(reason => {
                this.logger.error('[request] ', reason)
                throw reason;
            });
    }

}

module.exports = ReporterTarget;