module.exports = {
    target: [{
        api: "rbac.authorization.k8s.io",
        kind: "RoleBinding"
    }, {
        api: "rbac.authorization.k8s.io",
        kind: "ClusterRoleBinding"
    }],

    order: 120,

    kind: (item) => {
        if(item.config.kind == "RoleBinding") {
            return 'rlbndg'
        }
        if(item.config.kind == "ClusterRoleBinding") {
            return 'crlbndg'
        }
    },

    needNamespaceScope: true,
    namespaceNameCb: (item) => {
        if(item.config.kind == "RoleBinding") {
            return item.config.metadata.namespace;
        }
        if(item.config.kind == "ClusterRoleBinding") {
            return '';
        }
        throw new Error();
    },

    handler: ({ logger, scope, item, namespaceScope, namespaceName, createK8sItem, createAlert, determineSharedFlag }) =>
    {
        var bindingScope = namespaceScope.items.register(item.config);

        var subjects = item.config.subjects;
        if (subjects)
        {
            for(var subject of subjects)
            {
                if (subject.kind == 'ServiceAccount')
                {
                    var namespaceName = namespaceScope.name;
                    if (subject.namespace) {
                        namespaceName = subject.namespace;
                    }
                    var subjNamespaceScope = scope.getNamespaceScope(namespaceName);
                    var serviceAccountScope = subjNamespaceScope.items.get('ServiceAccount', subject.name);
                    if (serviceAccountScope) {
    
                        for (var serviceAccount of serviceAccountScope.items)
                        {
                            var logicItem = createK8sItem(serviceAccount);
                            bindingScope.registerItem(logicItem);
                            bindingScope.markUsedBy(logicItem);
                        } 
                    }
                    else
                    {
                        createAlert('Missing', 'error', null, 'Could not find ' + subject.namespace + '::' + subject.name + ' ServiceAccount.');
                    }
                }
            }
        }

        if (bindingScope.isNotUsed)
        {
            var rawContainer = scope.fetchRawContainer(item, item.config.kind + "s");
            var logicItem = createK8sItem(rawContainer);
            createAlert('Unused', 'warn', null, item.kind + ' not used.');
        } 

        determineSharedFlag(bindingScope);
    }
}