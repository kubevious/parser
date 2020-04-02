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
        namespaceScope.configMaps[item.config.metadata.name] = {
            used: false,
            usedBy: {},
            config: item.config
        }
    }
}