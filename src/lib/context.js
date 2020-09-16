process.stdin.resume();
process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
  process.exit(0);
});

const Promise = require('the-promise');
const K8sParser = require('./parsers/k8s');
const ConcreteRegistry = require('./concrete/registry');
const FacadeRegistry = require('./facade/registry');
const LogicProcessor = require('./logic/processor');
const Reporter = require('./reporting/reporter');
const DebugObjectLogger = require('./utils/debug-object-logger');
const ProcessingTracker = require("kubevious-helpers").ProcessingTracker;

class Context
{
    constructor(logger)
    {
        this._logger = logger.sublogger("Context");
        this._tracker = new ProcessingTracker(logger.sublogger("Tracker"));

        this._loaders = [];
        this._concreteRegistry = new ConcreteRegistry(this);
        this._k8sParser = new K8sParser(this);
        this._logicProcessor = new LogicProcessor(this);
        this._reporter = new Reporter(this);

        this._facadeRegistry = new FacadeRegistry(this);


        this._debugObjectLogger = new DebugObjectLogger(this);

        this._areLoadersReady = false;

        this._server = null;
        this._k8sClient = null;
    }

    get logger() {
        return this._logger;
    }

    get tracker() {
        return this._tracker;
    }

    get concreteRegistry() {
        return this._concreteRegistry;
    }

    get facadeRegistry() {
        return this._facadeRegistry;
    }

    get k8sParser() {
        return this._k8sParser;
    }

    get logicProcessor() {
        return this._logicProcessor;
    }

    get reporter() {
        return this._reporter;
    }

    get areLoadersReady() {
        return this._areLoadersReady;
    }

    get debugObjectLogger() {
        return this._debugObjectLogger;
    }

    addLoader(loader)
    {
        var loaderInfo = {
            loader: loader,
            isReady: false,
            readyHandler: (value) => {
                loaderInfo.isReady = value;
                this._logger.debug("[readyHandler] %s", value);
                this._checkLoadersReady();
            }
        }
        loader.setupReadyHandler(loaderInfo.readyHandler);
        this._loaders.push(loaderInfo);
    }

    setupServer()
    {
        const Server = require("./server");
        this._server = new Server(this);
    }

    setupK8sClient(client)
    {
        this._k8sClient = client;
    }

    run()
    {
        if (process.env.NODE_ENV == 'development')
        {
            this.tracker.enablePeriodicDebugOutput(10);
        }
        else
        {
            this.tracker.enablePeriodicDebugOutput(30);
        }
        
        return Promise.resolve()
            .then(() => this._processLoaders())
            .then(() => this._runServer())
            .catch(reason => {
                console.log("***** ERROR *****");
                console.log(reason);
                this.logger.error(reason);
                process.exit(1);
            });
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

    _runServer()
    {
        if (!this._server) {
            return;
        }

        this._server.run()
    }
}

module.exports = Context;