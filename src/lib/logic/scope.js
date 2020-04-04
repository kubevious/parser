const _ = require("the-lodash");
const LogicItem = require("./item");

class LogicScope
{
    constructor(context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("LogicScope");

        this._itemMap = {}
        this._root = LogicItem.constructTop(this);
        this._acceptItem(this._root);

        this._configMap = {};
        this._namespaceScopes = {};
        this._infraScope = new InfraScope(this);
    }

    get logger() {
        return this._logger;
    }

    get concreteRegistry() {
        return this._context.concreteRegistry;
    }

    get root() {
        return this._root;
    }

    get configMap() {
        return this._configMap;
    }

    _acceptItem(item) 
    {
        this._itemMap[item.dn] = item;
    }

    _dropItem(item) 
    {
        delete this._itemMap[item.dn];
    }

    extractItems() {
        return _.values(this._itemMap);
    }

    findItem(dn)
    {
        var item = this._itemMap[dn];
        if (!item) {
            item = null;
        }
        return item;
    }
    
    getNamespaceScope(name) {
        if (!this._namespaceScopes[name]) {
            this._namespaceScopes[name] = new NamespaceScope(this, name);
        }
        return this._namespaceScopes[name];
    }

    getAppAndScope(ns, name, createIfMissing) {
        var namespace = this.root.fetchByNaming("ns", ns);
        var namespaceScope = this.getNamespaceScope(ns);

        var app = namespace.fetchByNaming("app", name, !createIfMissing);
        if (!app) {
            return null; 
        }

        var appScope = namespaceScope.apps[name];
        if (!appScope) {
            appScope = {
                name: name,
                ports: {},
                properties: {
                    'Exposed': 'No'
                }
            };
            namespaceScope.apps[name] = appScope;
        }

        return {
            namespace: namespace,
            app: app,
            namespaceScope: namespaceScope,
            appScope: appScope
        }
    }

    getInfraScope() {
        return this._infraScope;
    }

    setK8sConfig(logicItem, config)
    {
        logicItem.setConfig(config);
        this.configMap[logicItem.dn] = config;

        logicItem.addProperties({
            kind: "yaml",
            id: "config",
            title: "Config",
            config: config
        });
    }

    fetchInfraRawContainer()
    {
        var infra = this.root.fetchByNaming("infra", "Infrastructure");
        infra.order = 1000;
        return infra;
    }

    fetchRawContainer(item, name)
    {
        var namespace = this.root.fetchByNaming("ns", item.config.metadata.namespace);
        var rawContainer = namespace.fetchByNaming("raw", "Raw Configs");
        rawContainer.order = 1000;
        var container = rawContainer.fetchByNaming("raw", name);
        return container;
    }
    
    findAppItem(namespace, name)
    {
        return this._findItem([
            {
                kind: "ns",
                name: namespace
            },
            {
                kind: "app",
                name: name
            }
        ]);
    }

    _findItem(itemPath)
    {
        var item = this.root;
        for(var x of itemPath) {
            item = item.findByNaming(x.kind, x.name);
            if (!item) {
                return null;
            }
        }
        return item;
    }
}


class InfraScope
{
    constructor(parent)
    {
        this._parent = parent;
        this._logger = parent.logger;
        this._nodeCount = 0
        this._nodeResources = {};
        this._clusterResources = {};

        this._items = new ItemsScope(this);
    }

    get logger() {
        return this._logger;
    }

    get nodeCount() {
        return this._nodeCount;
    }

    get clusterResources() {
        return this._clusterResources;
    }

    get nodeResources() {
        return this._nodeResources;
    }

    get items() {
        return this._items;
    }

    increaseNodeCount()
    {
        this._nodeCount += 1;
    }

    setClusterResources(value)
    {
        this._clusterResources = value;
    }

    setNodeResources(value)
    {
        this._nodeResources = value;
    }
}

class NamespaceScope
{
    constructor(parent, name)
    {
        this._parent = parent;
        this._logger = parent.logger;
        this._name = name;

        this._items = new ItemsScope(this);

        this.appLabels = [];
        this.apps = {};
        this.appControllers = {};
        this.appOwners = {};
        this.ingresses = {};
        this.secrets = {};
    }

    get logger() {
        return this._logger;
    }

    get name() {
        return this._name;
    }

    get items() {
        return this._items;
    }

    registerAppOwner(owner)
    {
        if (!this.appOwners[owner.config.kind]) {
            this.appOwners[owner.config.kind] = {};
        }
        if (!this.appOwners[owner.config.kind][owner.config.metadata.name]) {
            this.appOwners[owner.config.kind][owner.config.metadata.name] = [];
        }
        this.appOwners[owner.config.kind][owner.config.metadata.name].push(owner);
    }

    getAppOwners(kind, name)
    {
        if (!this.appOwners[kind]) {
            return []
        }
        if (!this.appOwners[kind][name]) {
            return []
        }
        return this.appOwners[kind][name];
    }

    getSecret(name)
    {
        if (!this.secrets[name]) {
            this.secrets[name] = {
                usedBy: {}
            }
        }
        return this.secrets[name];
    }

    findAppsByLabels(selector)
    {
        var result = [];
        for(var appLabelInfo of this.appLabels)
        {
            if (labelsMatch(appLabelInfo.labels, selector))
            {
                result.push(appLabelInfo.appItem);
            }
        }
        return result;
    }

    findAppScopesByLabels(selector)
    {
        var appItems = this.findAppsByLabels(selector);
        var result = appItems.map(x => {
            var appScope = this.apps[x.naming];
            return appScope;
        });
        result = result.filter(x => x);
        return result;
    }
}

class ItemsScope
{
    constructor(parent)
    {
        this._parent = parent;
        this._logger = parent.logger;

        this._itemsDict = {}
    }

    get logger() {
        return this._logger;
    }
    
    registerItem(config)
    {
        return this._registerItem(config.kind, config.metadata.name, config);
    }

    _registerItem(kind, name, config)
    {
        if (!this._itemsDict[kind])
        {
            this._itemsDict[kind] = {};
        }
        var item = new ItemScope(this._parent, config);
        this._itemsDict[kind][name] = item;
        return item;
    }

    getItem(kind, name)
    {
        if (_.isPlainObject(kind))
        {
            return this._getItem(kind.kind, kind.metadata.name);
        }
        else
        {
            return this._getItem(kind, name);
        }
    }

    _getItem(kind, name)
    {
        if (this._itemsDict[kind])
        {
            var value = this._itemsDict[kind][name];
            if (value)
            {
                return value;
            }
        }
        return null;
    }
}

class ItemScope
{
    constructor(parent, config)
    {
        this._parent = parent;
        this._usedBy = {};
        this._config = config;
        this._items = [];
        this._appsItems = {};
    }

    get config() {
        return this._config;
    }

    get usedBy() {
        return _.keys(this._usedBy);
    }

    get usedByCount() {
        return this.usedBy.length;
    }

    get isNotUsed() {
        return this.usedByCount == 0;
    }

    get isUsedByOne() {
        return this.usedByCount == 1;
    }

    get isUsedByMany() {
        return this.usedByCount > 1;
    }

    get items() {
        return this._items;
    }

    get appItems() {
        return _.values(this._appsItems);
    }

    get appScopes() {
        var names = _.keys(this._appsItems);
        return names.map(x => {
                return this._parent.apps[x];
            })
            .filter(x => x);
    }

    markUsedBy(dn)
    {
        this._usedBy[dn] = true;
    }
    
    registerItem(item)
    {
        this._items.push(item);
    }

    associateApp(item)
    {
        this._appsItems[item.naming] = item;
    }
}


function labelsMatch(labels, selector)
{
    for(var key of _.keys(selector)) {
        if (selector[key] != labels[key]) {
            return false;
        }
    }
    return true;
}

module.exports = LogicScope;