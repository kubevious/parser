const _ = require("the-lodash");

module.exports = {
    target: {
        path: ["ns", "app", "cont"]
    },

    order: 30,

    handler: ({scope, item, logger, helpers}) =>
    {
        var resourcesProps = {
        }
        for(var metric of helpers.resources.METRICS) {
            collectResourceMetric(metric);
        }

        item.addProperties({
            kind: "resources",
            id: "resources",
            title: "Resources",
            order: 7,
            config: resourcesProps
        });

        /*******************************************/

        function collectResourceMetric(metric)
        {
            if (!resourcesProps[metric]) {
                resourcesProps[metric] = {};
            }
            collectResourceMetricCounter(metric, 'request');
            collectResourceMetricCounter(metric, 'limit');
        }

        function collectResourceMetricCounter(metric, counter)
        {
            var rawValue = _.get(item.config, 'resources.' + counter + 's.' + metric);
            if (!rawValue) {
                rawValue = getDefaultMetric(metric, counter);
                if (!rawValue) {
                    return;
                }
            }
            resourcesProps[metric][counter] = helpers.resources.parse(metric, rawValue);
        }

        function getDefaultMetric(metric, counter)
        {
            return null;
            // TODO: Get from LimitRange.
            if (counter == 'request') {
                if (metric == 'cpu') {
                    return '100m';
                }
                if (metric == 'memory') {
                    return '100Mi'
                }
            }
        }
    }
}