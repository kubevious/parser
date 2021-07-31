import { ILogger } from 'the-logger';
import { Promise } from 'the-promise';

import { Backend, TimerFunction } from '@kubevious/helper-backend'

import { ProcessingTracker } from '@kubevious/helpers/dist/processing-tracker';

import { ConcreteRegistry } from './concrete/registry';

import { K8sParser } from './parsers/k8s';
import { FacadeRegistry } from './facade/registry';
import { WorldviousClient } from '@kubevious/worldvious-client';

import { Reporter } from './reporting/reporter';
import { DebugObjectLogger } from './utils/debug-object-logger';
import { WebServer } from './server';

import VERSION from './version'
import { ILoader } from './loaders/types';
import { K8sApiSelector } from './loaders/api-selector';

export class Context
{
    private _backend : Backend;
    private _logger : ILogger;
    private _tracker: ProcessingTracker;
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

    constructor(backend : Backend)
    {
        this._backend = backend;
        this._logger = backend.logger.sublogger('Context');

        this._tracker = new ProcessingTracker(this.logger.sublogger("Tracker"));

        this._apiSelector = new K8sApiSelector(this._logger);

        this._concreteRegistry = new ConcreteRegistry(this.logger);
        this._k8sParser = new K8sParser(this);
        this._reporter = new Reporter(this);

        this._facadeRegistry = new FacadeRegistry(this);

        this._debugObjectLogger = new DebugObjectLogger(this);
        
        this._worldvious = new WorldviousClient(this._logger, 'parser', VERSION);

        this._server = new WebServer(this);

        this.backend.registerErrorHandler((reason) => {
            return this.worldvious.acceptError(reason);
        });
    }

    get backend() {
        return this._backend;
    } 

    get logger() : ILogger {
        return this._logger;
    }

    get tracker() {
        return this._tracker;
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

    addLoader(loader : ILoader)
    {
        let loaderInfo : LoaderInfo = {
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

    run()
    {
        this._setupTracker();
        
        return Promise.resolve()
            .then(() => this._worldvious.init())
            .then(() => this._processLoaders())
            .then(() => this._server.run());
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
        return Promise.serial(this._loaders, x => {
            return x.loader.run();
        });
    }

    private _checkLoadersReady()
    {
        let areLoadersReady = this._calculateLoadersReady();
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
        for(let loader of this._loaders)
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