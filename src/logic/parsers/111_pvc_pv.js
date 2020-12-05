const _ = require("the-lodash");

module.exports = {
    targetKind: 'scope',

    target: {
        scopeKind: 'PersistentVolume'
    },

    kind: 'pv',

    order: 111,

    handler: ({ scope, itemScope, createK8sItem, createAlert }) =>
    {
        var claimRef = _.get(itemScope.config, 'spec.claimRef');
        if (claimRef)
        {
            var namespaceScope = scope.getNamespaceScope(claimRef.namespace);
            var pvcScope = namespaceScope.items.get('PersistentVolumeClaim', claimRef.name)
            if (pvcScope)
            {
                for(var pvcItem of pvcScope.items)
                {
                    var pv = pvcItem.fetchByNaming("pv", itemScope.name);
                    scope.setK8sConfig(pv, itemScope.config);
                    itemScope.registerItem(pv);
                    itemScope.markUsedBy(pv);
                }
            }
        }

        if (itemScope.isNotUsed)
        {
            var infra = scope.fetchInfraRawContainer();
            var storage = infra.fetchByNaming("storage", "Storage");
            var pvItem = createK8sItem(storage);
            createAlert('Unused', 'warn', 'PersistentVolume not attached.');
            itemScope.registerItem(pvItem);
        }

        itemScope.buildProperties()
            .fromConfig('StorageClass', 'spec.storageClassName')
            .fromConfig('Status', 'status.phase')
            .fromConfig('Finalizers', 'metadata.finalizers')
            .fromConfig('Capacity', 'status.capacity.storage')
            .fromConfig('Access Modes', 'spec.accessModes')
            .fromConfig('Volume Mode', 'spec.volumeMode')
            .fromConfig('Reclaim Policy', 'spec.persistentVolumeReclaimPolicy')
            .build()
    }
}