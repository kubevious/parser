module.exports = {
    target: [{
        api: "rbac.authorization.k8s.io",
        kind: "ClusterRole"
    }, {
        api: "rbac.authorization.k8s.io",
        kind: "Role"
    }],

    order: 115,

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

    handler: ({ logger, item, namespaceScope }) =>
    {
        var roleScope = namespaceScope.items.register(item.config);

        roleScope.data.rules = [];

        if (item.config.rules)
        {
            for(var rule of item.config.rules)
            {
                if (rule.apiGroups)
                {
                    for(var api of rule.apiGroups)
                    {
                        for(var resource of rule.resources)
                        {
                            for(var verb of rule.verbs)
                            {
                                if (rule.resourceNames) {
                                    for(var resourceName of rule.resourceNames) {
                                        roleScope.data.rules.push({
                                            api: api,
                                            resource: resource,
                                            resourceName: resourceName,
                                            verb: verb
                                        })
                                    }
                                } else {
                                    roleScope.data.rules.push({
                                        api: api,
                                        resource: resource,
                                        resourceName: '*',
                                        verb: verb
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}