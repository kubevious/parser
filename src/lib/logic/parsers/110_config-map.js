const _ = require("the-lodash");

module.exports = {
    target: {
        api: "v1",
        kind: "ConfigMap"
    },

    kind: 'configmap',

    order: 110,

    needNamespaceScope: true,

    handler: ({logger, scope, item, createK8sItem, createAlert, namespaceScope}) =>
    {
        var configMapScope = namespaceScope.items.getItem(item.config);

        if (configMapScope.isUsedByMany)
        {
            for(var userDn of configMapScope.usedBy)
            {
                var user = scope.findItem(userDn);
                if (!user) {
                    logger.error("Missing DN: %s", dn);
                }
                user.setFlag("shared");
                for(var dn of configMapScope.usedBy)
                {
                    if (dn != userDn) {
                        user.setUsedBy(dn);
                    }
                }
            }
        } 
        else if (configMapScope.isNotUsed)
        {
            var rawContainer = scope.fetchRawContainer(item, "ConfigMaps");
            createK8sItem(rawContainer);
            createAlert('Unused', 'warn', null, 'ConfigMap not used.');
        }
    }
}