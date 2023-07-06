import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { Snapshot } from './snapshot'
import { ReporterTarget } from './reporter-target';
import { CollectorConfig, Counter } from './types';
import { ConcreteRegistry } from '../concrete/registry';

export class Reporter
{
    private _context : Context;
    private _logger : ILogger;

    private _collectors : CollectorConfig[] = [];
    private _reporterTargets : ReporterTarget[] = [];

    private _counters: Counter;

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("Reporter");

        this._counters = {
            reportStartCount: 0,
            reportSuccessCount: 0,
            reportFailCount: 0,
            
            lastReportStartDate: null,
            lastReportSuccessDate: null,
            lastReportFailDate: null,
        }

        this._determineCollectors();

        this._setupTargetReporters();
    }

    get logger() {
        return this._logger;
    }

    get counters() {
        return this._counters;
    }

    process(concreteRegistry: ConcreteRegistry, date: Date)
    {
        this.logger.info("[process] count: %s", concreteRegistry.allItems.length)

        const snapshot = new Snapshot(date);
        for(const item of concreteRegistry.allItems)
        {
            snapshot.addItem(item);
        }

        for(const reporter of this._reporterTargets)
        {
            reporter.reportSnapshot(snapshot);
        }
    }

    private _determineCollectors()
    {
        this._collectors = [];
        for(const x of _.keys(process.env))
        {
            if (_.startsWith(x, 'KUBEVIOUS_COLLECTOR'))
            {
                const namePart = x.replace('KUBEVIOUS_COLLECTOR', '');
                if (!namePart.includes('_'))
                {
                    this._loadCollector(x);
                }
            }
        }
        this.logger.info("[_determineCollectors] Collectors: ", this._collectors);
    }

    private _loadCollector(urlEnvName: string)
    {
        const collectorConfig : CollectorConfig = {
            url: process.env[urlEnvName]!
        }
        const authEnvName = urlEnvName + '_AUTH';
        const keyPathEnvName = urlEnvName + '_KEY_PATH';
        if (process.env[authEnvName] && process.env[keyPathEnvName]) {
            collectorConfig.authUrl = process.env[authEnvName];
            collectorConfig.keyPath = process.env[keyPathEnvName];
        }
        this._collectors.push(collectorConfig)
    }

    private _setupTargetReporters()
    {
        for(const collector of this._collectors)
        {
            const target = new ReporterTarget(this._logger, collector, this._counters);
            this._reporterTargets.push(target);
        }
    }

}