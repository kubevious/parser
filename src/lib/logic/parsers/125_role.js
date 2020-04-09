const _ = require("the-lodash");

const K8S_RBAC_VERBS = ["get", "list", "watch", "create", "update", "patch", "delete"];
const K8S_RBAC_VERBS_ORDER = {};
for(var i = 0; i < K8S_RBAC_VERBS.length; i++) {
    K8S_RBAC_VERBS_ORDER[K8S_RBAC_VERBS[i]] = i;
}

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
            roleScope.registerItem(logicItem);
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

        var usedVerbs = {};
        for(var rule of roleScope.data.rules)
        {
            _.defaults(usedVerbs, rule.verbs);
        }

        var headers = [
            'api',
            'resource',
            'name'
        ]

        var verbHeaders = _.keys(usedVerbs);
        verbHeaders = _.orderBy(verbHeaders, x => {
            var order = K8S_RBAC_VERBS_ORDER[x];
            if (order) {
                return order;
            }
            return 0;
        })
        verbHeaders = verbHeaders.map(x => ({
            id: x,
            kind: 'check'
        }))

        headers = _.concat(headers, verbHeaders);

        var rules = _.orderBy(roleScope.data.rules, ['target.api', 'target.resource', 'target.name']) ;
        var roleTableConfig = {
            headers: headers,
            rows: rules.map(x => transformRow(x))
        }

        for(var logicItem of roleScope.items)
        {
            logicItem.addProperties({
                kind: "table",
                id: "resource-role-matrix",
                title: "Resource Role Matrix",
                order: 8,
                config: roleTableConfig
            });
        }

        determineSharedFlag(roleScope);

        /******/
        function transformRow(x)
        {
            var row = {
                api: x.target.api,
                resource: x.target.resource,
                name: x.target.name
            };

            for(var verb of _.keys(x.verbs)) {
                row[verb] = true;
            }

            return row;
        }
    }
}