import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

const fs = require('fs').promises;

const axios = require('axios');
import { JobDampener } from '@kubevious/helpers';

import { Snapshot } from './snapshot';
import { SnapshotReporter } from './snapshot-reporter';

import { HandledError } from '@kubevious/helpers/dist/handled-error';
import { RetryableAction } from '@kubevious/helpers/dist/retryable-action';
import { CollectorConfig } from './types';

export class ReporterTarget
{
    private _logger : ILogger;
    private _snapshotLogger : ILogger;

    private _config : CollectorConfig;
    private _baseUrl : string;

    private _axiosAuth : any;

    private _jobDampener : JobDampener<Snapshot>;

    private _latestSnapshot : Snapshot | null = null;
    private _latestSnapshotId : string | null = null;

    private _axiosCollector : any;

    private _token : string | null = null;
    private _apiKeyData : object | null = null;

    constructor(logger : ILogger, config : CollectorConfig)
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

        this._jobDampener = new JobDampener<Snapshot>(this._logger.sublogger("ReporterDampener"), this._reportSnapshot.bind(this));
    }

    get logger() {
        return this._logger;
    }

    setNextSnapshot(snapshot: Snapshot)
    {
        this._logger.info("[report] date: %s, item count: %s", snapshot.date.toISOString(), snapshot.count);
        this._jobDampener.acceptJob(snapshot, snapshot.date);
    }

    private _reportSnapshot(snapshot : Snapshot) : Promise<any>
    {
        this._logger.info("[_reportSnapshot] Date: %s, Item count: %s", snapshot.date.toISOString(), snapshot.count);

        let snapshotReporter = new SnapshotReporter(this, this._snapshotLogger, snapshot, this._latestSnapshot, this._latestSnapshotId);
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

                    throw new HandledError('Failed to report snapshot.');
                }
            })
    }

    private _retrySnapshotReport(snapshot : Snapshot) : Promise<any>
    {
        return Promise.timeout(3000)
            .then(() => this._reportSnapshot(snapshot));
    }

    request<TRequest, TResponse>(url : string, data : TRequest) : Promise<TResponse | null>
    {
        let action = new RetryableAction(this.logger, () => {
            return this._rawRequest(url, data);
        }, {
            initalDelay: 2 * 1000,
            maxDelay: 10 * 1000,
            retryCount: 5
        })
        action.canRetry((reason : any) => {
            if (reason instanceof HandledError) {
                return reason.canRetry;
            }
            return false;
        })
        return action.run()
            .then(response => {
                if (!response) {
                    return null;
                }
                return <TResponse>response;
            });
    }

    private _rawRequest<TRequest, TResponse>(url: string, data: TRequest) : Promise<TResponse | null>
    {
        this.logger.verbose("[request] url: %s%s", this._baseUrl, url);
        this.logger.silly("[request] url: %s%s, data: ", this._baseUrl, url, data);
        return this._prepareRequest()
            .then(() => this._axiosCollector.post(url, data))
            .then(res => <TResponse>res.data)
            .catch(reason => {
                if (reason.response) {
                    this.logger.error('[request] URL: %s, RESPONSE STATUS: %s', url, reason.response.status)
                    if (reason.response.status == 413) {
                        let size = _.get(reason, 'request._redirectable._requestBodyLength');
                        this.logger.warn('[request] Request too big. Ignoring. URL: %s, Size: %s bytes', url, size)
                        return null;
                    } else {
                        throw new HandledError("HTTP Error " + reason.response.status);
                    }
                } else if (reason.request) {
                    this.logger.error('[request] URL: %s, ERROR: %s', url, reason.message)
                    throw new HandledError("Could not connect", true);
                } else {
                    this.logger.error('[request] URL: %s. Reason: ', url, reason)
                    throw new HandledError("Unknown error " + reason.message);
                }
            });
    }

    private _prepareRequest()
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
                return this._axiosAuth.post('/', data)
            })
            .then(result => {
                this._token = result.data.token;
                this._createCollectorClient();
            })
    }

    private _getApiKey()
    {
        if (this._apiKeyData) {
            return Promise.resolve(this._apiKeyData);
        }
        return fs.readFile(this._config.keyPath, { encoding: 'utf8' })
            .then((data : any) => {
                this._apiKeyData = JSON.parse(data);
                this._token = null;
                return this._apiKeyData;
            });
    }

    private _createCollectorClient()
    {
        let headers : Record<string, string> = {};
        let options = {
            baseURL: this._baseUrl,
            timeout: 10 * 1000,
            headers: headers
        };
        if (this._token) {
            options.headers['Authorization'] = 'Bearer ' + this._token;
        }
        this._axiosCollector = axios.create(options);
    }

}