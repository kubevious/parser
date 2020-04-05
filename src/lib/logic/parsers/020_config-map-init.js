module.exports = {
    target: {
        api: "v1",
        kind: "ConfigMap"
    },

    order: 20,

    needNamespaceScope: true,

    handler: ({ item, namespaceScope }) =>
    {
        namespaceScope.items.register(item.config);
    }
}