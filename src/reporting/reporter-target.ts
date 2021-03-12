import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

const fs = require('fs').promises;

import { JobDampener } from '@kubevious/helpers';
import { HttpClient, HttpClientOptions } from '@kubevious/http-client';

import { Snapshot } from './snapshot';
import { SnapshotReporter } from './snapshot-reporter';

import { HandledError } from '@kubevious/helpers/dist/handled-error';
import { CollectorConfig, ReporterAuthResponse } from './types';

export class ReporterTarget
{
    private _logger : ILogger;
    private _snapshotLogger : ILogger;

    private _config : CollectorConfig;
    private _baseUrl : string;

    private _authHttpClient? : HttpClient;
    private _httpClient : HttpClient;

    private _jobDampener : JobDampener<Snapshot>;

    private _latestSnapshot : Snapshot | null = null;
    private _latestSnapshotId : string | null = null;

    constructor(logger : ILogger, config : CollectorConfig)
    {
        this._logger = logger.sublogger("ReporterTarget");
        this._snapshotLogger = logger.sublogger("SnapshotReporter");

        this._config = config;
        this._baseUrl = config.url;

        let options : Partial<HttpClientOptions> = {
            timeout: 10 * 1000,
            retry: {
                initRetryDelay: 2 * 1000,
                maxRetryDelay: 10 * 1000,
                retryCount: 5,
                canContinueCb: (reason, requestInfo) => {

                    const status = _.get(reason, 'response.status');

                    this.logger.warn('[canContinueCb] Error Status: %s. Message: %s', status, reason.message);

                    if (status) {
                        if (status == 413) {
                            let size = _.get(reason, 'request._redirectable._requestBodyLength');
                            this.logger.warn('[canContinueCb] Request too big. Ignoring. URL: %s, Size: %s bytes', requestInfo.url, size)
                            return false;
                        }
                    }

                    return true;
                }
            },
            tracker: {
                failedAttempt: (requestInfo) => {
                    this.logger.warn('[FAILED ATTEMPT] %s, ', requestInfo.url, requestInfo.headers);
                }
            }

        };

        if (config.authUrl) {
            this._authHttpClient = new HttpClient(config.authUrl, {
                timeout: 10 * 1000,
            })

            options.authorizerCb = () => {


                this.logger.info("[AUTH-CB] Begin...")

                return this._getApiKey()
                    .then(apiKeyData => {
                        this.logger.info("[AUTH-CB] apiKeyData: ", apiKeyData)
                        return this._authHttpClient!.post<ReporterAuthResponse>('/', apiKeyData)
                    })
                    .then(result => {
                        this.logger.info("[AUTH-CB] result: ", result.data)

                        return `Bearer ${result.data.token}`;
                    })

            }
        }

        this._httpClient = new HttpClient(this._baseUrl, options);

        this._jobDampener = new JobDampener<Snapshot>(this._logger.sublogger("ReporterDampener"), this._reportSnapshot.bind(this));
    }

    get logger() {
        return this._logger;
    }

    reportSnapshot(snapshot: Snapshot)
    {
        this._logger.info("[reportSnapshot] Date: %s, Item count: %s", snapshot.date.toISOString(), snapshot.count);
        this._jobDampener.acceptJob(snapshot, snapshot.date);
    }

    request<TRequest, TResponse>(url : string, data : TRequest) : Promise<TResponse | null>
    {
        return this._httpClient.post<TResponse>(url, data)
            .then(result => {
                return result.data;
            })
            .catch(reason => {

                const status = _.get(reason, 'response.status');
                this.logger.warn('[request] Error Status: %s. Message: %s', status, reason.message);

                if (status) {
                    if (status == 413) {
                        let size = _.get(reason, 'request._redirectable._requestBodyLength');
                        this.logger.warn('[request] Request too big. Ignoring. URL: %s, Size: %s bytes', url, size)
                        return null;
                    }
                }

                throw reason;
            })
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

    private _getApiKey() : Promise<any>
    {
        return fs.readFile(this._config.keyPath, { encoding: 'utf8' })
            .then((data : any) => {
                const apiKeyData = JSON.parse(data);
                return apiKeyData;
            });
    }

}