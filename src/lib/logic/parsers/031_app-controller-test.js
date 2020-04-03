const _ = require("the-lodash");
const resourcesHelper = require("../helpers/resources");

module.exports = {

    targetKind: 'logic',

    target: {
        path: ["ns", "app", "launcher"]
    },

    order: 31,

    kind: 'zibil',

    handler: ({scope, item, logger, context, createItem}) =>
    {
        createItem(item.parent, 'kaka');
    }
}
