const _ = require("the-lodash");

module.exports = {
    target: {
        api: "v1",
        kind: "PersistentVolumeClaim"
    },

    kind: 'pvc',

    order: 110,

    needNamespaceScope: true,

    handler: ({logger, scope, item, createK8sItem, createAlert, namespaceScope, determineSharedFlag}) =>
    {
        var pvcScope = namespaceScope.items.get(item.config);

        determineSharedFlag(pvcScope);

        if (pvcScope.isNotUsed)
        {
            var rawContainer = scope.fetchRawContainer(item, "PersistentVolumeClaims");
            var pvcItem = createK8sItem(rawContainer);
            createAlert('Unused', 'warn', 'PersistentVolumeClaim not attached.');
            pvcScope.registerItem(pvcItem);
        }
    }
}