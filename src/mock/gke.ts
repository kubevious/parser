import _ from 'the-lodash'
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { K8sLoader } from '../loaders/k8s';

import { KubernetesClient } from 'k8s-super-client';
import { ClusterManagerClient } from '@google-cloud/container';
import { HttpClient } from '@kubevious/http-client';
import { ApiResourceStatus, ILoader, ReadyHandler } from '../loaders/types';


const jwt = require('jsonwebtoken');


export class GKELoader implements ILoader
{
    private _context : Context;
    private _logger : ILogger;

    private _credentials: any;
    private _loader : ILoader | null = null;
    private _readyHandler? : ReadyHandler;
    private _name: string;
    private _region: string;

    constructor(context: Context, credentials: any, name: string, region: string)
    {
        this._context = context;
        this._logger = context.logger.sublogger("GKELoader");
        this._credentials = credentials;
        this._name = name;
        this._region = region;

        this.logger.info("Constructed");
    }

    get logger() {
        return this._logger;
    }

    setupReadyHandler(handler : ReadyHandler)
    {
        this._readyHandler = handler;
        if (this._loader) {
            this._loader.setupReadyHandler(this._readyHandler);
        }
    }

    close()
    {
        
    }
    
    run()
    {
        return this._queryCluster()
            .then(cluster => {
                return this._connectToCluster(cluster);
            })
            .then(client => {
                let info = {
                    infra: "gke",
                    project: this._credentials.project_id,
                    cluster: this._name,
                    region: this._region
                }
        
                this._loader = new K8sLoader(this._context, client, info);
                this._loader.setupReadyHandler(this._readyHandler!);
                return this._loader.run();
            })
    }

    extractApiStatuses() : ApiResourceStatus[]
    {
        if (!this._loader) {
            return [];
        }
        return this._loader.extractApiStatuses();
    }

    private _queryCluster()
    {
        let client = new ClusterManagerClient({
            credentials: this._credentials
        });

        let params = {
            name: `projects/${this._credentials.project_id}/locations/${this._region}/clusters/${this._name}`
        }
        this.logger.info("[queryCluster] ", params);
        return client.getCluster(params)
            .then(results => {
                return _.head(results);
            })
            .catch(reason => {
                if (reason.code == 5) {
                    // this.logger.warn(reason);
                    return null;
                }
                throw reason;
            });
    }

    private _connectToCluster(cluster: any)
    {
        this.logger.silly('[connectToRemoteKubernetes] Cluster: ', cluster);

        return this._loginToK8s()
            .then(result => {
                this.logger.silly('[connectToRemoteKubernetes] LoginResult: ', result);

                let config = {
                    server: 'https://' + cluster.endpoint,
                    token: result.access_token,
                    httpAgent: {
                        ca: Buffer.from(cluster.masterAuth.clusterCaCertificate, 'base64').toString('ascii'),
                    }
                }

                const client = new KubernetesClient(this.logger, config);
                return client.init();
            });
    }


    private _loginToK8s()
    {
        const client = new HttpClient('');

        const data = {
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': this._buildK8sToken()
        };

        this.logger.silly('[loginToK8s] request data: ', data);
        return client.post<any>('https://www.googleapis.com/oauth2/v4/token', {}, data)
            .then(result => {
                this.logger.silly('[loginToK8s] result: ', result);
                return result.data;
            })
    }

    private _buildK8sToken()
    {
        const TOKEN_DURATION_IN_SECONDS = 3600;
        let issuedAt = Math.floor(Date.now() / 1000);
        let token = jwt.sign(
            {
                'iss': this._credentials.client_email,
                'sub': this._credentials.client_email,
                'aud': 'https://www.googleapis.com/oauth2/v4/token',
                'scope': 'https://www.googleapis.com/auth/cloud-platform',
                'iat': issuedAt,
                'exp': issuedAt + TOKEN_DURATION_IN_SECONDS,
            },
            this._credentials.private_key,
            {
                algorithm: 'RS256',
                header: {
                'kid': this._credentials.private_key_id,
                'typ': 'JWT',
                'alg': 'RS256',
                },
            }
        );
        return token;
    }
}
