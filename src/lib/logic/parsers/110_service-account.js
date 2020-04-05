const _ = require("the-lodash");

module.exports = {

    target: {
        api: "v1",
        kind: "ServiceAccount"
    },


    order: 110,

    kind: 'svcaccnt',

    needNamespaceScope: true,

    handler: ({scope, item, logger, context, createItem, namespaceScope, createK8sItem, createAlert, determineSharedFlag}) =>
    {
        var serviceAccountScope = namespaceScope.items.get(item.config);

        if (serviceAccountScope.hasNoOwner)
        {
            var rawContainer = scope.fetchRawContainer(item, "ServiceAccounts");
            createK8sItem(rawContainer);
            createAlert('Unused', 'warn', null, 'ServiceAccount not used.');
        } 
        else 
        {
            for(var owner of serviceAccountScope.owners)
            {
                var item = createK8sItem(owner);
                serviceAccountScope.registerItem(item);
                serviceAccountScope.markUsedBy(item);
            }

            determineSharedFlag(serviceAccountScope);
        }
    }
}
