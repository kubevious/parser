import { ILogger } from 'the-logger';
import { Promise } from 'the-promise';

import { Backend, TimerFunction } from '@kubevious/helper-backend'

import { ProcessingTracker } from '@kubevious/helpers/dist/processing-tracker';
const { WorldviousClient } = require('@kubevious/worldvious-client');

import { ConcreteRegistry } from './concrete/registry';

import { K8sParser } from './parsers/k8s';
import { FacadeRegistry } from './facade/registry';

import { LogicProcessor } from './logic/processor';
import { SnapshotReporter } from './reporting/reporter';
import { DebugObjectLogger } from './utils/debug-object-logger';
import { WebServer } from './server';

import * as VERSION from './version'

export class Context
{
    private backend : Backend;
    private _logger : ILogger;
    private _tracker: any;
    private _loaders: any[] = [];
    private _concreteRegistry: ConcreteRegistry;
    private _k8sParser: K8sParser;
    private _logicProcessor: any;
    private _reporter: any;
    private _facadeRegistry: FacadeRegistry;
    private _debugObjectLogger: DebugObjectLogger;
    private _worldvious: any;
    private _server: WebServer;
    private _k8sClient: any;
    private _areLoadersReady = false;

    constructor(backend : Backend)
    {
        this.backend = backend;
        this._logger = backend.logger.sublogger('Context');

        this._tracker = new ProcessingTracker(this.logger.sublogger("Tracker"));

        this._concreteRegistry = new ConcreteRegistry(this);
        this._k8sParser = new K8sParser(this);
        this._logicProcessor = new LogicProcessor(this);
        this._reporter = new SnapshotReporter(this);

        this._facadeRegistry = new FacadeRegistry(this);

        this._debugObjectLogger = new DebugObjectLogger(this);
        
        this._worldvious = new WorldviousClient(this._logger, 'parser', VERSION);

        this._server = new WebServer(this);

        this._k8sClient = null;
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

    get logicProcessor() {
        return this._logicProcessor;
    }

    get reporter() {
        return this._reporter;
    }

    get areLoadersReady() : boolean {
        return this._areLoadersReady;
    }

    get debugObjectLogger() : DebugObjectLogger {
        return this._debugObjectLogger;
    }

    get worldvious() {
        return this._worldvious;
    }

    addLoader(loader : any)
    {
        var loaderInfo = {
            loader: loader,
            isReady: false,
            readyHandler: (value : any) => {
                loaderInfo.isReady = value;
                this._logger.debug("[readyHandler] %s", value);
                this._checkLoadersReady();
            }
        }
        loader.setupReadyHandler(loaderInfo.readyHandler);
        this._loaders.push(loaderInfo);
    }

    setupK8sClient(client : any)
    {
        this._k8sClient = client;
    }

    run()
    {
        this._setupTracker();
        
        return Promise.resolve()
            .then(() => this._worldvious.init())
            .then(() => this._processLoaders())
            .then(() => this._server.run())
            .catch(reason => {
                console.log("***** ERROR *****");
                console.log(reason);
                this.logger.error(reason);
                return Promise.resolve(this.worldvious.acceptError(reason))
                    .then(() => {
                        process.exit(1);
                    })
            });
    }

    _setupTracker()
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

    _processLoaders()
    {
        return Promise.serial(this._loaders, x => {
            return x.loader.run();
        });
    }

    _checkLoadersReady()
    {
        var areLoadersReady = this._calculateLoadersReady();
        if (areLoadersReady != this._areLoadersReady) {
            this._areLoadersReady = areLoadersReady;
            this.logger.info("[_checkLoadersReady] areLoadersReady: %s", areLoadersReady);

            if (this._areLoadersReady)
            {
                this.facadeRegistry.handleAreLoadersReadyChange();
            }
        }
    }

    _calculateLoadersReady()
    {
        for(var loader of this._loaders)
        {
            if (!loader.isReady) {
                return false;
            }
        }
        return true;
    }
}

module.exports.Context = Context;