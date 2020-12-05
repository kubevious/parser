const _ = require("the-lodash");

module.exports = {
    target: {
        api: "v1",
        kind: "Service"
    },

    kind: "service",

    order: 40,

    needNamespaceScope: true,

    handler: ({scope, item, createK8sItem, createAlert, hasCreatedItems, namespaceScope}) =>
    {
        let serviceScope = namespaceScope.items.register(item.config);

        const serviceType = _.get(item.config, 'spec.type');
        if (serviceType == 'ClusterIP' || 
            serviceType == 'NodePort' ||
            serviceType == 'LoadBalancer')
        {
            let appSelector = _.get(item.config, 'spec.selector');
            if (appSelector)
            {
                let appScopes = namespaceScope.findAppScopesByLabels(appSelector);
                for(let appScope of appScopes)
                {
                    serviceScope.associateAppScope(appScope);

                    appScope.properties['Exposed'] = 'With Service';

                    let appItem = appScope.item;

                    let serviceItemName = serviceType;
                    let serviceCount = appItem.getChildrenByKind('service')
                        .filter(x => serviceType == serviceItemName)
                        .length;
                    if (serviceCount != 0) {
                        serviceItemName += " " + (serviceCount + 1);
                    }
                    createService(appItem, { name: serviceItemName, order: 200 });
                    
                    let portsConfig = _.get(item.config, 'spec.ports');
                    if (portsConfig) {
                        for(let portConfig of portsConfig) {      
                            let appPort = portConfig.targetPort;                   
                            let appPortInfo = appScope.ports[appPort];
                            if (appPortInfo) {
                                createService(appPortInfo.portItem, { name: serviceItemName })
                            } else {
                                createAlert('Port-' + appPort, 'warn', 'Missing port ' + appPort + ' definition.');
                            }
                        }
                    }
                }

                if (appScopes.length == 0) {
                    createAlert('MissingApp', 'error', 'Could not find apps matching selector.');
                } else if (appScopes.length > 1) {
                    createAlert('MultipleApps', 'warn', 'More than one apps matched selector.');
                }
            }
        }

        if (!hasCreatedItems()) {
            let rawContainer = scope.fetchRawContainer(item, "Services");
            createService(rawContainer);
        }

        /*** HELPERS ***/
        function createService(parent, params)
        {
            let k8sService = createK8sItem(parent, params);
            serviceScope.registerItem(k8sService);
            return k8sService;
        }

    }
}