module.exports = {
    target: {
        api: "v1",
        kind: "PersistentVolumeClaim"
    },

    order: 20,

    needNamespaceScope: true,

    handler: ({ item, namespaceScope }) =>
    {
        namespaceScope.items.register(item.config);
    }
}