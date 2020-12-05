const _ = require("the-lodash");

module.exports = {

    targetKind: 'logic',

    target: {
        path: ["ns", "app", "launcher"]
    },

    order: 33,

    needNamespaceScope: true,

    handler: ({ item, namespaceScope }) =>
    {
        var app = item.parent;
        var appScope = app.scope;

        var name = _.get(item.config, 'spec.template.spec.serviceAccountName');
        if (!name) {
            name = _.get(item.config, 'spec.template.spec.serviceAccount');
        }

        if (!name) {
            name = 'default';
        }
        
        if (name)
        {
            var serviceAccountScope = namespaceScope.items.get('ServiceAccount', name);
            if (serviceAccountScope) {
                serviceAccountScope.registerOwnerItem(app);
            } else {
                app.addAlert('Missing', 'error', 'Service account ' + name + ' is not found.');
            }
        }
        else
        {
            app.addAlert('Missing', 'warn', 'Service account is not set.');
        }
    }
}
