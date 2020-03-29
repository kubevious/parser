const Promise = require('the-promise');
const _ = require('lodash');
const JobDampener = require('../utils/job-dampener');

class FacadeRegistry
{
    constructor(context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("FacadeRegistry");
        this._jobDampener = new JobDampener(this._logger.sublogger("FacadeDampener"), this._processItems.bind(this));

        this._context.concreteRegistry.onChanged(this._handleConcreteRegistryChange.bind(this));
    }

    get logger() {
        return this._logger;
    }

    acceptItems(value)
    {
        this._logger.info("[acceptItems] item count: %s", _.keys(value).length);
        this._jobDampener.acceptJob(new Date(), value);
    }

    _processItems(date, value)
    {
        this._logger.info("[_processItems] Date: %s. item count: %s", date.toISOString(), _.keys(value).length);

    }

    _handleConcreteRegistryChange()
    {
        this._logger.info("[_handleConcreteRegistryChange] BEGIN");

        if (this._context.areLoadersReady) {
            this._context.logicProcessor.process();
        }

        this._logger.info("[_handleConcreteRegistryChange] END");
    }

    handleAreLoadersReadyChange()
    {
        this._logger.info("[handleAreLoadersReadyChange] ");
        this._handleConcreteRegistryChange();
    }
}

module.exports = FacadeRegistry;