const _ = require("the-lodash");

module.exports = {

    targetKind: 'logic',

    target: {
        path: ["ns", "app", "launcher"]
    },

    order: 32,

    kind: 'vol',
    needNamespaceScope: true,

    handler: ({scope, item, logger, context, createItem, createAlert, namespaceScope}) =>
    {
        var app = item.parent;
        var appScope = app.scope;

        var volumesProperties = {

        }
        var volumesConfig = _.get(item.config, 'spec.template.spec.volumes');
        if (!volumesConfig || !_.isArray(volumesConfig)) {
            volumesConfig = [];
        }
        var volumesMap = _.makeDict(volumesConfig, x => x.name);

        volumesProperties['Count'] = volumesConfig.length;
        appScope.properties['Volumes'] = volumesConfig.length;

        if (volumesConfig.length > 0)
        {
            var volumes = app.fetchByNaming("vol", "Volumes");

            volumes.addProperties({
                kind: "key-value",
                id: "properties",
                title: "Properties",
                order: 5,
                config: volumesProperties
            });  

            for(var volumeConfig of volumesConfig) {
                processVolumeConfig(
                    volumes, 
                    volumeConfig,
                    false);
            }

            for(var container of appScope.allContainerItems)
            {
                processContainerItem(container)
            }
        }

        function processContainerItem(container)
        {
            var volumeMounts = _.get(container.config, 'volumeMounts');
            if (!_.isArray(volumeMounts) || volumeMounts.length == 0) {
                return;
            }

            for(var volumeRefConfig of volumeMounts) {
                var volumeConfig = volumesMap[volumeRefConfig.name];
                if (volumeConfig) {
                    var volumeItem = processVolumeConfig(
                        container, 
                        volumeConfig,
                        true);

                    volumeItem.addProperties({
                        kind: "yaml",
                        id: "env",
                        title: "Mount Config",
                        order: 5,
                        config: volumeRefConfig
                    });  
                }
            }
        }

        /** HELPERS **/

        function processVolumeConfig(parent, volumeConfig, markUsedBy)
        {
            var volume = createItem(parent, volumeConfig.name);
            scope.setK8sConfig(volume, volumeConfig);
        
            if (volumeConfig.configMap) {
                findAndProcessConfigMap(volume, volumeConfig.configMap.name, markUsedBy, volumeConfig.configMap.optional)
            }

            if (volumeConfig.secret) {
                findAndProcessSecret(volume, volumeConfig.secret.secretName, markUsedBy)
            }

            return volume;
        }
        
        function findAndProcessConfigMap(parent, name, markUsedBy, isOptional)
        {
            var configMapScope = namespaceScope.items.get('ConfigMap', name);
            if (configMapScope)
            {
                var configmap = parent.fetchByNaming("configmap", name);
                scope.setK8sConfig(configmap, configMapScope.config);
                if (markUsedBy) {
                    configMapScope.markUsedBy(configmap);
                }
            }
            else
            {
                if (!isOptional) {
                    createAlert("MissingConfig", "error", 'Could not find ConfigMap ' + name);
                }
            }
            return configMapScope;
        }

        function findAndProcessSecret(parent, name, markUsedBy)
        {
            var secret = parent.fetchByNaming("secret", name);
            if (markUsedBy) {
                var secretScope = namespaceScope.items.fetch('Secret', name);
                secretScope.markUsedBy(secret);
            }
        }
    }
}
