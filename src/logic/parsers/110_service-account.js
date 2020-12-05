const _ = require("the-lodash");

module.exports = {

    target: {
        api: "v1",
        kind: "ServiceAccount"
    },

    order: 110,

    kind: 'svcaccnt',

    needNamespaceScope: true,

    handler: ({scope, item, namespaceScope, createK8sItem, createAlert, determineSharedFlag}) =>
    {
        var serviceAccountScope = namespaceScope.items.get(item.config);

        if (serviceAccountScope.hasNoOwner)
        {
            var rawContainer = scope.fetchRawContainer(item, "ServiceAccounts");
            var logicItem = createK8sItem(rawContainer);
            logicItem.associateScope(serviceAccountScope);

            if (logicItem.naming != 'default')
            {
                createAlert('Unused', 'warn', 'ServiceAccount not used.');
            }
        } 
        else 
        {
            for(var owner of serviceAccountScope.owners)
            {
                var logicItem = createK8sItem(owner);
                logicItem.associateScope(serviceAccountScope);
                serviceAccountScope.registerItem(logicItem);
                serviceAccountScope.markUsedBy(logicItem);
            }

            determineSharedFlag(serviceAccountScope);
        }
    }
}
