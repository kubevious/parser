module.exports = {
    target: {
        api: "v1",
        kind: "ServiceAccount"
    },

    order: 20,

    needNamespaceScope: true,

    handler: ({item, namespaceScope }) =>
    {
    }
}