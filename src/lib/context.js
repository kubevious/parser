class Context
{
    constructor(logger)
    {
        this._logger = logger.sublogger("Context");
    }

    get logger() {
        return this._logger;
    }

    addLoader()
    {
     
    }

    run()
    {
        // return Promise.resolve()
        setInterval(this._doSomething.bind(this), 1000);
    }

    _doSomething()
    {
        this.logger.info("[doSomething]")
    }
}

module.exports = Context;