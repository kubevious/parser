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

        var appSelector = _.get(itemScope.config, 'spec.podSelector.matchLabels');
        if (appSelector)
        {
            var appScopes = namespaceScope.findAppScopesByLabels(appSelector);
            for(var appScope of appScopes)
            {
                var container = appScope.item.fetchByNaming("netpols", "NetworkPolicies");

                var k8sNetworkPolicy = createK8sItem(container, 
                    { });
                itemScope.registerItem(k8sNetworkPolicy);

                var ingressTrafficTable = {
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

                var ingressConfig = _.get(itemScope.config, 'spec.ingress');

                if (ingressConfig)
                {
                    for(var ingressItem of ingressConfig)
                    {
                        var portsInfo = "*";
                        if (ingressItem.ports)
                        {
                            portsInfo = ingressItem.ports.map(x => {
                                var items = [x.port, x.name, x.protocol];
                                items = _.filter(items, x => _.isNotNullOrUndefined(x));
                                return items.join('/');
                            })
                            .join(', ');
                        }

                        if (ingressItem.from)
                        {
                            for(var fromItem of ingressItem.from)
                            {
                                var labelsConfig = _.get(fromItem, 'podSelector.matchLabels');
                                // logger.error("ZZZZZ fromApp Labels: ", labelsConfig);
                                if (labelsConfig)
                                {
                                    var fromAppScopes = namespaceScope.findAppScopesByLabels(labelsConfig);
                                    for(var fromAppScope of fromAppScopes)
                                    {
                                        ingressTrafficTable.rows.push({
                                            dn: fromAppScope.item.dn,
                                            ports: portsInfo
                                        })
                                    }
                                    // logger.error("ZZZZZ fromAppScopes: ", fromAppScopes.map(x => x.name));
                                }
                            }
                        }
                    }
                }
                // if (fromList)
                // {
                //     for(var from of fromList)
                //     {
                //         var fromAppScopes = namespaceScope.findAppScopesByLabels(appSelector);
                //         {

                //         }
                //     }
                // }

                k8sNetworkPolicy.addProperties({
                    kind: "table",
                    id: "ingress-traffic",
                    title: "Ingress Traffic",
                    order: 8,
                    config: ingressTrafficTable
                });

            }
        }

    }
}