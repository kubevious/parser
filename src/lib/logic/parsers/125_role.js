module.exports = {
    target: [{
        api: "rbac.authorization.k8s.io",
        kind: "ClusterRole"
    }, {
        api: "rbac.authorization.k8s.io",
        kind: "Role"
    }],

    order: 125,

    kind: (item) => {
        if(item.config.kind == "Role") {
            return 'rl'
        }
        if(item.config.kind == "ClusterRole") {
            return 'crl'
        }
    },

    needNamespaceScope: true,
    namespaceNameCb: (item) => {
        if(item.config.kind == "Role") {
            return item.config.metadata.namespace;
        }
        if(item.config.kind == "ClusterRole") {
            return '';
        }
        throw new Error();
    },

    handler: ({ logger, scope, item, namespaceScope, namespaceName, createK8sItem, createAlert, determineSharedFlag }) =>
    {
        var roleScope = namespaceScope.items.get(item.config.kind, item.config.metadata.name);

        if (roleScope.hasNoOwner)
        {
            var rawContainer = scope.fetchRawContainer(item, item.config.kind + "s");
            var logicItem = createK8sItem(rawContainer);
            createAlert('Unused', 'warn', null, item.kind + ' not used.');
        } 
        else
        {
            for(var owner of roleScope.owners)
            {
                var logicItem = createK8sItem(owner);
                roleScope.registerItem(logicItem);
                roleScope.markUsedBy(logicItem);
            }
        }

        determineSharedFlag(roleScope);
    }
}