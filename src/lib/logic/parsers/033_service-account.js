const _ = require("the-lodash");

module.exports = {

    targetKind: 'logic',

    target: {
        path: ["ns", "app", "launcher"]
    },

    order: 33,

    kind: 'svcaccnt',

    handler: ({scope, item, logger, context, createItem}) =>
    {
        var app = item.parent;
        var appScope = app.scope;

        var name = _.get(item.config, 'spec.template.spec.serviceAccountName');
        if (!name) {
            name = _.get(item.config, 'spec.template.spec.serviceAccount');
        }

        if (name)
        {
            createItem(item.parent, name);
        }
        else
        {
            app.createAlert('Missing', 'error', null, 'Service account is not set.');
        }
    }
}
