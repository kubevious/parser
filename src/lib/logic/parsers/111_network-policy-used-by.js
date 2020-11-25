const _ = require("the-lodash");

module.exports = {
    targetKind: 'scope',

    target: {
        namespaced: true,
        scopeKind: 'NetworkPolicy'
    },

    order: 111,

    handler: ({logger, scope, itemScope, determineSharedFlag}) =>
    {
        determineSharedFlag(itemScope);
    }
}