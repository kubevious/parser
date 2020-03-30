const Promise = require('the-promise');
const _ = require('lodash');
const JobDampener = require('../utils/job-dampener');

class ReporterTarget
{
    constructor(logger, collector)
    {
        this._logger = logger.sublogger("ReporterTarget");
        this._url = collector.url;
        this._jobDampener = new JobDampener(this._logger.sublogger("ReporterDampener"), this._processSnapshot.bind(this));
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

        return Promise.timeout(5000)
    }

}

module.exports = ReporterTarget;