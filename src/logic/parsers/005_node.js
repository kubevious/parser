const _ = require("the-lodash");

module.exports = {
    target: {
        api: "v1",
        kind: "Node"
    },

    kind: 'node',

    order: 10,

    handler: ({scope, item, createK8sItem, infraScope, helpers}) =>
    {
        infraScope.increaseNodeCount();
        
        var infra = scope.fetchInfraRawContainer();

        var nodes = infra.fetchByNaming("nodes", "Nodes");

        var node = createK8sItem(nodes);

        var resourcesProps = {
        }
        for(var metric of helpers.resources.METRICS) {
            collectResourceMetric(metric);
        }

        node.addProperties({
            kind: "resources",
            id: "resources",
            title: "Resources",
            order: 7,
            config: resourcesProps
        });

        /********/

        function collectResourceMetric(metric)
        {
            if (!resourcesProps[metric]) {
                resourcesProps[metric] = {};
            }
            collectResourceMetricCounter(metric, 'capacity');
            collectResourceMetricCounter(metric, 'allocatable');
        }

        function collectResourceMetricCounter(metric, counter)
        {
            var rawValue = _.get(item.config, 'status.' + counter + '.' + metric);
            if (!rawValue) {
                return;
            }
            resourcesProps[metric][counter] = helpers.resources.parse(metric, rawValue);
        }
    }
}