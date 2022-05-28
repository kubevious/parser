import { ILogger } from 'the-logger';
import { Promise } from 'the-promise';

import { Backend } from '@kubevious/helper-backend'

import { ConcreteRegistry } from './concrete/registry';

import { K8sParser } from './parsers/k8s';
import { FacadeRegistry } from './facade/registry';
import { WorldviousClient } from '@kubevious/worldvious-client';

import { Reporter } from './reporting/reporter';
import { DebugObjectLogger } from './utils/debug-object-logger';
import { WebServer } from './server';

import { ILoader } from './loaders/types';
import { K8sApiSelector } from './loaders/api-selector';
import { BackendMetrics } from './apps/backend-metrics';

import VERSION from './version'


export type LoaderFetcherCb = () => Promise<ILoader>;

export class Context
{
    private _backend : Backend;
    private _logger : ILogger;
    private _loaders: LoaderInfo[] = [];
    private _concreteRegistry: ConcreteRegistry;
    private _k8sParser: K8sParser;
    private _reporter: Reporter;
    private _facadeRegistry: FacadeRegistry;
    private _debugObjectLogger: DebugObjectLogger;
    private _worldvious: WorldviousClient;
    private _server: WebServer;
    private _areLoadersReady = false;
    private _apiSelector: K8sApiSelector;
    private _backendMetrics : BackendMetrics;

    private _loaderFetcherCb : LoaderFetcherCb;

    constructor(backend : Backend, loaderFetcherCb : LoaderFetcherCb)
    {
        this._backend = backend;
        this._logger = backend.logger.sublogger('Context');
        this._loaderFetcherCb = loaderFetcherCb;

        this._apiSelector = new K8sApiSelector(this._logger);

        this._concreteRegistry = new ConcreteRegistry(this.logger);
        this._k8sParser = new K8sParser(this);
        this._reporter = new Reporter(this);

        this._facadeRegistry = new FacadeRegistry(this);

        this._debugObjectLogger = new DebugObjectLogger(this);
        
        this._worldvious = new WorldviousClient(this._logger, 'parser', VERSION);

        this._backendMetrics = new BackendMetrics(this);

        this._server = new WebServer(this);

        this.backend.registerErrorHandler((reason) => {
            return this.worldvious.acceptError(reason);
        });

        this.backend.stage("tracker", () => this._setupTracker());

        this.backend.stage("fetch-loader", () => {
            return Promise.resolve()
                .then(() => this._loaderFetcherCb())
                .then(loader => {
                    this._acceptLoader(loader);
                })
        });

        this.backend.stage("worldvious", () => this._worldvious.init());

        this.backend.stage("loaders", () => this._processLoaders());

        this.backend.stage("server", () => this._server.run());
    }

    get backend() {
        return this._backend;
    } 

    get logger() : ILogger {
        return this._logger;
    }

    get tracker() {
        return this._backend.tracker;
    }

    get concreteRegistry() : ConcreteRegistry {
        return this._concreteRegistry;
    }

    get facadeRegistry() : FacadeRegistry {
        return this._facadeRegistry;
    }

    get k8sParser() : K8sParser {
        return this._k8sParser;
    }

    get reporter() : Reporter {
        return this._reporter;
    }

    get areLoadersReady() : boolean {
        return this._areLoadersReady;
    }

    get debugObjectLogger() : DebugObjectLogger {
        return this._debugObjectLogger;
    }

    get worldvious() : WorldviousClient {
        return this._worldvious;
    }

    get apiSelector() {
        return this._apiSelector;
    }

    get loaders() {
        return this._loaders.map(x => x.loader);
    }

    get backendMetrics() {
        return this._backendMetrics;
    }

    private _acceptLoader(loader : ILoader)
    {
        const loaderInfo : LoaderInfo = {
            loader: loader,
            isReady: false,
            readyHandler: (value : any) => {
                loaderInfo.isReady = value;
                this._logger.info("[readyHandler] %s", value);
                this._checkLoadersReady();
            }
        }
        loader.setupReadyHandler(loaderInfo.readyHandler);
        this._loaders.push(loaderInfo);
    }

    private _setupTracker()
    {
        if (process.env.NODE_ENV == 'development')
        {
            this.tracker.enablePeriodicDebugOutput(10);
        }
        else
        {
            this.tracker.enablePeriodicDebugOutput(30);
        }

        this.tracker.registerListener((extractedData : any) => {
            this._worldvious.acceptMetrics(extractedData);
        })
    }

    private _processLoaders()
    {
        this._checkLoadersReady();

        return Promise.serial(this._loaders, x => {
            return x.loader.run(this);
        });
    }

    private _checkLoadersReady()
    {
        const areLoadersReady = this._calculateLoadersReady();
        if (areLoadersReady != this._areLoadersReady) {
            this._areLoadersReady = areLoadersReady;
            this.logger.info("[_checkLoadersReady] areLoadersReady: %s", areLoadersReady);

            if (this._areLoadersReady)
            {
                this.facadeRegistry.handleAreLoadersReadyChange();
            }
        }
    }

    private _calculateLoadersReady()
    {
        for(const loader of this._loaders)
        {
            if (!loader.isReady) {
                return false;
            }
        }
        return true;
    }
}

interface LoaderInfo 
{
    loader: ILoader,
    isReady: boolean,
    readyHandler: (value : any) => void,
}