module.exports = {
    target: {
        api: "v1",
        kind: "PersistentVolume"
    },

    order: 20,

    handler: ({ logger, item, scope }) =>
    {
        scope.getInfraScope().items.register(item.config);
    }
}