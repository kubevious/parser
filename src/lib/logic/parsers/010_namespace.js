const _ = require("the-lodash");

module.exports = {
    target: {
        api: "v1",
        kind: "Namespace"
    },

    kind: 'ns',

    order: 10,

    handler: ({scope, item, createK8sItem}) =>
    {
        createK8sItem(scope.root);

        let labels = _.get(item.config, 'metadata.labels');
        scope.registerNamespaceLabels(item.config.metadata.name, labels);
    }
}