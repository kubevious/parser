const _ = require("the-lodash");

module.exports = {
    targetKind: 'scope',

    target: {
        namespaced: true,
        scopeKind: 'NetworkPolicy'
    },

    order: 110,

    kind: "netpol",

    // needNamespaceScope: true,

    handler: ({logger, scope, itemScope, createK8sItem}) =>
    {
        namespaceScope = itemScope.parent;

        let policyTypes = _.get(itemScope.config, 'spec.policyTypes');
        if (!policyTypes || policyTypes.length == 0) {
            policyTypes = ['Ingress'];
        }

        let policyProperties = {
            
        };

        policyProperties['Ingress'] = _.includes(policyTypes, 'Ingress');
        policyProperties['Egress'] = _.includes(policyTypes, 'Egress');

        var appSelector = _.get(itemScope.config, 'spec.podSelector.matchLabels');
        if (!appSelector)
        {
            appSelector = {};
        }

        var appScopes = namespaceScope.findAppScopesByLabels(appSelector);
        for(var appScope of appScopes)
        {
            var container = appScope.item.fetchByNaming("netpols", "NetworkPolicies");

            var k8sNetworkPolicy = createK8sItem(container, 
                { });
            itemScope.registerItem(k8sNetworkPolicy);

            processRules(k8sNetworkPolicy, 
                'Ingress',
                'spec.ingress',
                'from');
            
            processRules(k8sNetworkPolicy, 
                'Egress',
                'spec.egress',
                'to');
        }

        itemScope.addProperties(policyProperties);

        ///

        function processRules(k8sNetworkPolicy, policyType, specPath, rulesPath)
        {
            if (!_.includes(policyTypes, policyType)) {
                return;
            }

            var trafficTable = {
                headers: [
                    {
                        id: 'dn',
                        label: 'Application',
                        kind: 'shortcut'
                    },
                    "ports"
                ],
                rows: []
            }

            var policyConfig = _.get(itemScope.config, specPath);
            if (policyConfig)
            {
                for(var policyItem of policyConfig)
                {
                    var portsInfo = "*";
                    if (policyItem.ports)
                    {
                        portsInfo = policyItem.ports.map(x => {
                            var items = [x.port, x.name, x.protocol];
                            items = _.filter(items, x => _.isNotNullOrUndefined(x));
                            return items.join('/');
                        })
                        .join(', ');
                    }

                    let rules = _.get(policyItem, rulesPath);
                    if (rules)
                    {
                        for(var rule of rules)
                        {
                            let ipBlock = _.get(rule, 'ipBlock');
                            if (ipBlock)
                            {

                            }
                            else
                            {
                                var podSelectorLabels = _.get(rule, 'podSelector.matchLabels');
                                if (!podSelectorLabels)
                                {
                                    podSelectorLabels = {};
                                }
    
                                let targetNamespaceScopes = [namespaceScope];
                                let namespaceSelectorLabels = _.get(rule, 'namespaceSelector.matchLabels');
                                if (namespaceSelectorLabels)
                                {
                                    targetNamespaceScopes = scope.findNamespaceScopesByLabels(namespaceSelectorLabels);
                                }
    
                                for(let targetNamespaceScope of targetNamespaceScopes)
                                {
                                    var fromAppScopes = targetNamespaceScope.findAppScopesByLabels(podSelectorLabels);
                                    for(var fromAppScope of fromAppScopes)
                                    {
                                        trafficTable.rows.push({
                                            dn: fromAppScope.item.dn,
                                            ports: portsInfo
                                        })
                                    }
                                }
                            }
                            
                        }
                    }
                }
            }

            k8sNetworkPolicy.addProperties({
                kind: "table",
                id: `${policyType.toLowerCase()}-traffic`,
                title: `${policyType} Traffic Allowed`,
                order: 8,
                config: trafficTable
            });

        }
    }
}