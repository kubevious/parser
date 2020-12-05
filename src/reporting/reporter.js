const Promise = require('the-promise');
const _ = require('the-lodash');
const Snapshot = require('./snapshot');
const ReporterTarget = require('./target');

class SnapshotReporter
{
    constructor(context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("Reporter");
        this._determineCollectors();

        for(var collector of this._collectors)
        {
            collector.target = new ReporterTarget(this._logger, collector.config);
        }
    }

    get logger() {
        return this._logger;
    }

    _determineCollectors()
    {
        this._collectors = [];
        for(var x of _.keys(process.env))
        {
            if (_.startsWith(x, 'KUBEVIOUS_COLLECTOR'))
            {
                var namePart = x.replace('KUBEVIOUS_COLLECTOR', '');
                if (!namePart.includes('_'))
                {
                    this._loadCollector(x);
                }
            }
        }
        this.logger.info("[_determineCollectors] Collectors: ", this._collectors);
    }

    _loadCollector(urlEnvName)
    {
        var collectorConfig = {
            url: process.env[urlEnvName]
        }
        var authEnvName = urlEnvName + '_AUTH';
        var keyPathEnvName = urlEnvName + '_KEY_PATH';
        if (process.env[authEnvName] && process.env[keyPathEnvName]) {
            collectorConfig.authUrl = process.env[authEnvName];
            collectorConfig.keyPath = process.env[keyPathEnvName];
        }
        this._collectors.push({
            config: collectorConfig
        })
    }

    acceptLogicItems(date, items)
    {
        this._logger.info("[acceptLogicItems] item count: %s", items.length);
        var snapshot = this._transforItems(date, items);
        for(var key of snapshot.keys)
        {
            this._logger.silly("[acceptLogicItems] hash: %s", key);
        }
        this._logger.info("[acceptLogicItems] obj count: %s", snapshot.count);

        return Promise.serial(this._collectors, x => x.target.report(snapshot));
    }

    _transforItems(date, items)
    {
        var snapshot = new Snapshot(date);

        for(var item of items)
        {
            snapshot.addItem({
                dn: item.dn,
                kind: item.kind,
                config_kind: 'node',
                config: item.exportNode()
            });

            var alerts = item.extractAlerts();
            if (alerts.length > 0) 
            {
                snapshot.addItem({
                    dn: item.dn,
                    kind: item.kind,
                    config_kind: 'alerts',
                    config: alerts
                });
            }

            var properties = item.extractProperties();
            for(var props of properties)
            {
                snapshot.addItem({
                    dn: item.dn,
                    kind: item.kind,
                    config_kind: 'props',
                    name: props.id,
                    config: props
                })
            }
        }

        return snapshot;
    }

}

module.exports = SnapshotReporter;