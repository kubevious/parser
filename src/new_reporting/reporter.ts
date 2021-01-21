import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { Snapshot } from './snapshot'
import { ReporterTarget } from './reporter-target';
import { CollectorConfig } from './types';

export class NewSnapshotReporter
{
    private _context : Context;
    private _logger : ILogger;

    private _collectors : CollectorConfig[] = [];
    private _reporterTargets : ReporterTarget[] = [];

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("NewReporter");

        this._determineCollectors();

        this._setupTargetReporters();
    }

    get logger() {
        return this._logger;
    }

    process()
    {
        this.logger.info("[process] count: %s", this._context.concreteRegistry.allItems.length)

        const snapshot = new Snapshot(new Date());
        for(let item of this._context.concreteRegistry.allItems)
        {
            snapshot.addItem(item);
        }

        this._setNextSnapshot(snapshot)
    }

    private _setNextSnapshot(snapshot: Snapshot)
    {
        for(let reporter of this._reporterTargets)
        {
            reporter.setNextSnapshot(snapshot);
        }
    }

    private _determineCollectors()
    {
        this._collectors = [];
        for(let x of _.keys(process.env))
        {
            if (_.startsWith(x, 'KUBEVIOUS_V2_COLLECTOR'))
            {
                let namePart = x.replace('KUBEVIOUS_V2_COLLECTOR', '');
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
        let collectorConfig : CollectorConfig = {
            url: process.env[urlEnvName]!
        }
        let authEnvName = urlEnvName + '_AUTH';
        let keyPathEnvName = urlEnvName + '_KEY_PATH';
        if (process.env[authEnvName] && process.env[keyPathEnvName]) {
            collectorConfig.authUrl = process.env[authEnvName];
            collectorConfig.keyPath = process.env[keyPathEnvName];
        }
        this._collectors.push(collectorConfig)
    }

    private _setupTargetReporters()
    {
        for(let collector of this._collectors)
        {
            let target = new ReporterTarget(this._logger, collector);
            this._reporterTargets.push(target);
        }
    }

}