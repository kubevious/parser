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

    handler: ({ scope, item, namespaceScope, namespaceName, createK8sItem, createAlert, determineSharedFlag, helpers }) =>
    {
        var bindingScope = namespaceScope.items.register(item.config);

        var targetNamespaceName = null;
        if(item.config.kind == "RoleBinding") {
            targetNamespaceName = item.config.metadata.namespace;
        } else if(item.config.kind == "ClusterRoleBinding") {
            targetNamespaceName = '*';
        }

        var subjects = item.config.subjects;
        if (subjects)
        {
            for(var subject of subjects)
            {
                if (subject.kind == 'ServiceAccount')
                {
                    var subjNamespaceName = namespaceScope.name;
                    if (subject.namespace) {
                        subjNamespaceName = subject.namespace;
                    }
                    var subjNamespaceScope = scope.getNamespaceScope(subjNamespaceName);
                    var serviceAccountScope = subjNamespaceScope.items.get('ServiceAccount', subject.name);
                    if (serviceAccountScope) {
                        if (!serviceAccountScope.data.bindings) {
                            serviceAccountScope.data.bindings = [];
                        }
                        serviceAccountScope.data.bindings.push(bindingScope);

                        for (var serviceAccount of serviceAccountScope.items)
                        {
                            var logicItem = createK8sItem(serviceAccount);
                            bindingScope.registerItem(logicItem);
                            bindingScope.markUsedBy(logicItem);

                            if (targetNamespaceName != subjNamespaceName)
                            {
                                logicItem.setPropagatableFlag("xnamespace");
                            }
                        } 
                    }
                    else
                    {
                        createAlert('Missing', 'error', 'Could not find ' + subject.namespace + '::' + subject.name + ' ServiceAccount.');
                    }
                }
            }
        }

        if (item.config.roleRef)
        {
            var targetNamespaceScope;
            if (item.config.roleRef.kind == 'ClusterRole') {
                targetNamespaceScope = scope.getNamespaceScope('');
            } else {
                targetNamespaceScope = namespaceScope;
            }
            var targetRoleScope = targetNamespaceScope.items.get(item.config.roleRef.kind, item.config.roleRef.name);
            if (targetRoleScope)
            {
                if (!bindingScope.data.roles) {
                    bindingScope.data.roles = [];
                }
                bindingScope.data.roles.push(targetRoleScope);

                for(var logicItem of bindingScope.items)
                {
                    targetRoleScope.registerOwnerItem(logicItem);
                }
            }
            else
            {
                createAlert('Missing', 'error', 'Unresolved ' + item.config.roleRef.kind + ' ' + item.config.roleRef.name);
            }
        }

        if (bindingScope.isNotUsed)
        {
            var rawContainer = scope.fetchRawContainer(item, item.config.kind + "s");
            var logicItem = createK8sItem(rawContainer);
            bindingScope.registerItem(logicItem);
            createAlert('Unused', 'warn', logicItem.prettyKind + ' not used.');
        } 

        bindingScope.data.rules = helpers.roles.makeRulesMap();
        var roleScopes = bindingScope.data.roles;
        if (roleScopes)
        {
            for(var roleScope of roleScopes)
            {
                bindingScope.data.rules = helpers.roles.combineRulesMap(
                    bindingScope.data.rules,
                    roleScope.data.rules,
                    targetNamespaceName);
            }
        }
        bindingScope.data.rules = helpers.roles.optimizeRulesMap(bindingScope.data.rules);

        var propsConfig = helpers.roles.buildRoleMatrix(bindingScope.data.rules);
        bindingScope.addPropertyGroup(propsConfig);

        determineSharedFlag(bindingScope);
    }
}