const _ = require("the-lodash");
const NameHelpers = require("../../utils/name-helpers.js");

module.exports = {
    targetKind: 'logic',

    target: [{
        path: ["ns", "app", "launcher", "pod"]
    }, {
        path: ["ns", "app", "launcher", "replicaset", "pod"]
    }],

    order: 101,

    needNamespaceScope: true,

    handler: ({scope, item, namespaceScope}) =>
    {
        var volumes = _.get(item.config, 'spec.volumes');
        if (volumes)
        {
            for(var volume of volumes)
            {
                var pvcName = _.get(volume, 'persistentVolumeClaim.claimName');
                if (pvcName)
                {
                    var pvcScope = namespaceScope.items.get('PersistentVolumeClaim', pvcName);
                    if (pvcScope)
                    {
                        var pvc = item.fetchByNaming("pvc", pvcScope.name);
                        scope.setK8sConfig(pvc, pvcScope.config);
                        pvcScope.markUsedBy(pvc);
                    }     
                }
            }
        }

    }
}