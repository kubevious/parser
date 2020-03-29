const Promise = require('the-promise');
const _ = require('the-lodash');
const DateUtils = require("kubevious-helpers").DateUtils;

class JobDampener
{
    constructor(logger, handler)
    {
        this._logger = logger;
        this._jobQueue = [];
        this._isProcessing = false;
        this._isScheduled = false;
        this._handlerCb = handler;

        this._queueSize = 10;
        this._rescheduleTimeoutMs = 5000;
    }

    get logger() {
        return this._logger;
    }

    acceptJob(date, data)
    {
        this._logger.info("[acceptJob] ...");
        this._jobQueue.push({ date: date, data: data});
        this._logger.info("[acceptJob] jobs in queue: %s", this._jobQueue.length);

        this._filterJobs();

        this._tryProcessJob();
    }

    _filterJobs()
    {
        var timeDeltas = [];
        for(var i = 0; i < this._jobQueue.length - 1; i++)
        {
            var job = this._jobQueue[i];
            var nextJob = this._jobQueue[i + 1];
            var seconds = DateUtils.diffSeconds(nextJob.date, job.date);
            timeDeltas.push({
                index: i,
                diff: seconds
            })
        }

        var toRemoveCount = Math.max(this._jobQueue.length - this._queueSize, 0);

        if (toRemoveCount > 0)
        {
            var toRemove = _(timeDeltas).orderBy(['diff']).take(toRemoveCount).value();
            toRemove = _.orderBy(toRemove, ['index'], ['desc']);
            for(var x of toRemove)
            {
                this._jobQueue.splice(x.index, 1);
            }
        }
    }

    _processJob(job)
    {
        this.logger.info("[_processJob] BEGIN. Date: %s", job.date.toISOString());

        return Promise.resolve()
            .then(() => {
                return this._handlerCb(job.date, job.data);
            })
            .then(() => {
                this.logger.info("[_processJob] END");
            })
            .catch(reason => {
                this.logger.error(reason);
            });
    }

    _tryProcessJob()
    {
        if (this._isProcessing) {
            return;
        }

        if (this._jobQueue.length == 0) {
            this._logger.info("[_tryProcessJob] empty");
            return;
        }

        var job = _.head(this._jobQueue);
        this._isProcessing = true;
        return this._processJob(job)
            .then(() => {
                this._logger.info("[_tryProcessJob] END");
                this._jobQueue.shift();
                this._isProcessing = false;
                return this._tryProcessJob();
            })
            .catch(reason => {
                this._logger.error("[_tryProcessJob] ", reason);
                this._isProcessing = false;
                this._rescheduleProcess();
            })
    }

    _rescheduleProcess()
    {
        this._logger.info("[_rescheduleProcess]");
        if (this._isScheduled) {
            return;
        }
        this._isScheduled = true;

        setTimeout(() => {
            this._isScheduled = false;
            this._tryProcessJob();
        }, this._rescheduleTimeoutMs);
    }

}

module.exports = JobDampener;