const Promise = require('the-promise');
const _ = require('lodash');
const fs = require('fs').promises;
const axios = require('axios');
const JobDampener = require('../utils/job-dampener');
const SnapshotReporter = require('./snapshot-reporter');
const HandledError = require('kubevious-helpers').HandledError;
const RetryableAction = require('kubevious-helpers').RetryableAction;

class ReporterTarget
{
    constructor(logger, config)
    {
        this._logger = logger.sublogger("ReporterTarget");
        this._snapshotLogger = logger.sublogger("SnapshotReporter");

        this._config = config;
        this._baseUrl = config.url;
        this._createCollectorClient();

        if (config.authUrl) {
            this._axiosAuth = axios.create({
                baseURL: config.authUrl,
                timeout: 10 * 1000,
            });
        }

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
        let action = new RetryableAction(this.logger, () => {
            return this._rawRequest(url, data);
        }, {
            initalDelay: 2 * 1000,
            maxDelay: 10 * 1000,
            retryCount: 5
        })
        action.canRetry((reason) => {
            return reason instanceof RetryableError;
        })
        return action.run();
    }

    _rawRequest(url, data)
    {
        this.logger.verbose("[request] url: %s%s", this._baseUrl, url);
        this.logger.silly("[request] url: %s%s, data: ", this._baseUrl, url, data);
        return this._prepareRequest()
            .then(() => this._axiosCollector.post(url, data))
            .then(res => res.data)
            .catch(reason => {
                if (reason.response) {
                    this.logger.error('[request] URL: %s, RESPONSE STATUS: %s', url, reason.response.status)
                    if (reason.response.status == 413) {
                        var size = _.get(reason, 'request._redirectable._requestBodyLength');
                        this.logger.warn('[request] Request too big. Ingoring. URL: %s, Size: %s bytes', url, size)
                        return {};
                    } else {
                        throw new HandledError("HTTP Error " + reason.response.status);
                    }
                } else if (reason.request) {
                    this.logger.error('[request] URL: %s, ERROR: %s', url, reason.message)
                    throw new RetryableError("Could not connect");
                } else {
                    this.logger.error('[request] URL: %s. Reason: ', url, reason)
                    throw new HandledError("Unknown error " + reason.message);
                }
            });
    }

    _prepareRequest()
    {
        if (!this._axiosAuth) {
            return Promise.resolve();
        }
        if (this._token) {
            return Promise.resolve();
        }

        return Promise.resolve()
            .then(() => this._getApiKey())
            .then(data => {
                this.logger.silly('[_prepareRequest] ', data);
                return this._axiosAuth.post('/', data)
            })
            .then(result => {
                this.logger.silly('[_prepareRequest] JWT: ', result.data);
                this._token = result.data.token;
                this._createCollectorClient();
            })
    }

    _getApiKey()
    {
        if (this._apiKeyData) {
            return Promise.resolve(this._apiKeyData);
        }
        return fs.readFile(this._config.keyPath, { encoding: 'utf8' })
            .then(data => {
                this._apiKeyData = JSON.parse(data);
                this._token = null;
                return this._apiKeyData;
            });
    }

    _createCollectorClient()
    {
        var options = {
            baseURL: this._baseUrl,
            timeout: 10 * 1000,
            headers: {}
        };
        if (this._token) {
            options.headers['Authorization'] = 'Bearer ' + this._token;
        }
        this._axiosCollector = axios.create(options);
    }

}

class RetryableError extends HandledError {  
    constructor (message) {
      super(message)
  
      this.name = this.constructor.name
    }
}

module.exports = ReporterTarget;