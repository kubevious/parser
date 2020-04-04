module.exports = {
    target: {
        api: "v1",
        kind: "ConfigMap"
    },

    kind: 'configmap',

    order: 20,

    needNamespaceScope: true,

    handler: ({scope, item, namespaceScope }) =>
    {
        namespaceScope.items.registerItem(item.config);
    }
}