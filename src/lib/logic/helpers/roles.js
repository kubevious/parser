const _ = require('the-lodash');

module.exports.makeRulesMap = function() {
    return {};
}

module.exports.addRule = function(rulesMap, api, resource, name, verbs) {

    var apiKey = makeKey(api, resource);
    if (!rulesMap[apiKey]) {
        rulesMap[apiKey] = {
            api: {
                api,
                resource,
            },
            items: []
        };
    }

    rulesMap[apiKey].items.push({
        name,
        verbs: _.makeDict(verbs, x => x, x => true)
    });
}

module.exports.combineRulesMap = function(a, b, targetNamespace) {
    for(var key of _.keys(b))
    {
        var bValue = b[key];
        if (!a[key]) {
            a[key] = {
                api: bValue.api,
                items: []
            }
        }

        for(var bItem of bValue.items)
        {
            var aItem = _.cloneDeep(bItem);
            if (targetNamespace) {
                aItem.namespace = targetNamespace;
            }
            a[key].items.push(aItem);
        }
    }
    return a;
}

module.exports.optimizeRulesMap = function(rulesMap) {

    for(var key of _.keys(rulesMap))
    {
        var apiRules = rulesMap[key];
        apiRules.items = optimizeRulesItems(apiRules.items);
    }
    return rulesMap;
}

function optimizeRulesItems(items)
{
    var allNsNamedMap = {};
    for(var item of items)
    {
        if (!item.namespace || item.namespace == '*')
        {
            if (item.name != '*') {
                addToNsMap(allNsNamedMap, '*', item);
            }
        }
    }
    for(var item of items)
    {
        if (!item.namespace || item.namespace == '*')
        {
            if (item.name == '*') {
                if (!isAllNsRulePresent(allNsNamedMap, item)) {
                    addToNsMap(allNsNamedMap, '*', item);
                }
            }
        }
    }
    for(var item of items)
    {
        if (item.namespace && item.namespace != '*')
        {
            if (!isAllNsRulePresent(allNsNamedMap, item)) {
                addToNsMap(allNsNamedMap, item.namespace, item);
            }
        }
    }

    var newItems = [];
    for(var ns of _.keys(allNsNamedMap))
    {
        for(var name of _.keys(allNsNamedMap[ns]))
        {
            newItems.push({
                namespace: ns,
                name: name,
                verbs: allNsNamedMap[ns][name]
            });
        }
    }

    return newItems;
}

function isAllNsRulePresent(allNsNamedMap, item)
{
    if (isAllNsRulePresentInNamespace(allNsNamedMap, '*', item))
    {
        return true;
    }
    if (item.namespace != '*') 
    {
        if (isAllNsRulePresentInNamespace(allNsNamedMap, item.namespace, item))
        {
            return true;
        }
    }
    return false;
}

function isAllNsRulePresentInNamespace(allNsNamedMap, namespace, item)
{
    if (allNsNamedMap[namespace]) {
        if (allNsNamedMap[namespace]['*'])
        {
            if (areVerbsPresent(allNsNamedMap[namespace]['*'], item.verbs)) {
                return true
            }
        }
    }
    return false;
}

function areVerbsPresent(aVerbs, bVerbs)
{
    for(var x of _.keys(bVerbs)) {
        if (!aVerbs[x]) {
            return false;
        }
    }
    return true;
}

function addToNsMap(allNsNamedMap, ns, item)
{
    if (!allNsNamedMap[ns]) {
        allNsNamedMap[ns] = {};
    }
    var verbsDict = allNsNamedMap[ns][item.name]
    if (!verbsDict) {
        verbsDict = {}
        allNsNamedMap[ns][item.name] = verbsDict;
    }
    _.defaults(verbsDict, item.verbs);
}

module.exports.buildRoleMatrix = function(rulesMap) {

    var usedVerbs = {};
    for(var apiRules of _.values(rulesMap))
    {
        for(var item of apiRules.items)
        {
            _.defaults(usedVerbs, item.verbs);
        }
    }

    var headers = [
        {
            id: 'api',
            label: "API Group"
        },
        {
            id: 'resource',
            label: 'Resource'
        },
        {
            id: 'namespace',
            label: 'Namespace'
        },
        {
            id: 'name',
            label: 'Name'
        }
    ]

    var verbHeaders = _.keys(usedVerbs);
    verbHeaders = _.orderBy(verbHeaders, x => {
        var order = K8S_RBAC_VERBS_ORDER[x];
        if (order) {
            return order;
        }
        return 0;
    })
    verbHeaders = verbHeaders.map(x => ({
        id: x,
        kind: 'check'
    }))

    headers = _.concat(headers, verbHeaders);

    var rows = [];
    for(var apiRules of _.values(rulesMap))
    {
        for(var item of apiRules.items)
        {
            var row = {
                api: apiRules.api.api,
                resource: apiRules.api.resource,
                name: item.name
            }
            row.namespace = item.namespace || '*';
            _.defaults(row, item.verbs);
            rows.push(row);
        }
    }

    rows = _.orderBy(rows, [
        'api', 
        'resource',
        'name'
    ]);

    var roleTableConfig = {
        headers: headers,
        rows: rows
    }

    var config = {
        kind: "table",
        id: "resource-role-matrix",
        title: "Resource Role Matrix",
        order: 8,
        config: roleTableConfig
    };

    return config;
}

function makeKey(api, resource)
{
    var key;
    if (api) {
        key = api + '/' + resource;
    } else {
        key = resource;
    }
    return key.toLowerCase();
}


const K8S_RBAC_VERBS = ["get", "list", "watch", "create", "update", "patch", "delete"];
const K8S_RBAC_VERBS_ORDER = {};
for(var i = 0; i < K8S_RBAC_VERBS.length; i++) {
    K8S_RBAC_VERBS_ORDER[K8S_RBAC_VERBS[i]] = i;
}