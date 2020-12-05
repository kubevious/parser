const _ = require('the-lodash');

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

    handler: ({ item, namespaceScope, helpers }) =>
    {
        var roleScope = namespaceScope.items.register(item.config);

        roleScope.data.rules = helpers.roles.makeRulesMap();

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
                            if (rule.resourceNames) {
                                for(var resourceName of rule.resourceNames) {
                                    helpers.roles.addRule(roleScope.data.rules, api, resource, resourceName, rule.verbs)
                                }
                            } else {
                                helpers.roles.addRule(roleScope.data.rules, api, resource, '*', rule.verbs)
                            }
                        }
                    }
                }
            }
        }

        roleScope.data.roleMatrixProps = helpers.roles.buildRoleMatrix(roleScope.data.rules);
    }
}