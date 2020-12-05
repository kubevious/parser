const _ = require("the-lodash");

module.exports = {
    target: [{
        api: "apps",
        kind: "Deployment"
    }, {
        api: "apps",
        kind: "DaemonSet"
    }, {
        api: "apps",
        kind: "StatefulSet"
    }, {
        api: "batch",
        kind: "Job"
    }],

    order: 30,

    needAppScope: true,
    canCreateAppIfMissing: true,
    appNameCb: (item) => {
        return item.config.metadata.name; 
    },

    handler: ({logger, scope, item, app, appScope, namespaceScope}) =>
    {
        app.associateScope(appScope);

        var labelsMap = _.get(item.config, 'spec.template.metadata.labels');
        if (labelsMap) {
            namespaceScope.registerAppScopeLabels(appScope, labelsMap);
        }

        var launcher = app.fetchByNaming("launcher", item.config.kind);
        scope.setK8sConfig(launcher, item.config);
        namespaceScope.registerAppOwner(launcher);
        launcher.associateScope(appScope);

        appScope.properties['Launcher'] = item.config.kind;

        if (item.config.kind == "Deployment" || 
            item.config.kind == "StatefulSet")
        {
            appScope.properties['Replicas'] = _.get(item.config, 'spec.replicas');
        }

        app.addProperties({
            kind: "key-value",
            id: "properties",
            title: "Properties",
            order: 5,
            config: appScope.properties
        });  

        app.addProperties(launcher.getProperties('labels'));
    }
}


