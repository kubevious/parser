const _ = require("the-lodash");

module.exports = {
    target: {
        path: ["ns"]
    },

    order: 10,

    handler: ({scope, item, logger}) =>
    {
        var namespaceScope = scope.getNamespaceScope(item.naming);

        var properties = {
            "Applications": namespaceScope.appCount,
            "Ingresses": namespaceScope.items.countItems('Ingress'),
            "Secrets": namespaceScope.items.countItems('Secret')
        }

        item.addProperties({
            kind: "key-value",
            id: "properties",
            title: "Properties",
            order: 5,
            config: properties
        });  
    }
}