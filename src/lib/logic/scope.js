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
    
    getInfraScope() {
        return this._infraScope;
    }

    getNamespaceScope(name) {
        if (!this._namespaceScopes[name]) {
            this._namespaceScopes[name] = new NamespaceScope(this, name);
        }
        return this._namespaceScopes[name];
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

        this._item = this._parent.root.fetchByNaming("ns", name);

        this._appScopes = {};

        this._items = new ItemsScope(this);

        this.appLabels = [];
        this.appControllers = {};
        this.appOwners = {};
    }

    get logger() {
        return this._logger;
    }

    get name() {
        return this._name;
    }

    get item() {
        return this._item;
    }

    get items() {
        return this._items;
    }

    get appScopes() {
        return _.values(this._appScopes);
    }

    get appCount() {
        return this.appScopes.length;
    }

    getAppAndScope(name, createIfMissing)
    {
        var appScope = this._appScopes[name];
        if (!appScope)
        {
            if (!createIfMissing)
            {
                return null;
            }
        }

        var appScope = new AppScope(this, name);
        this._appScopes[name] = appScope;
        return appScope;
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

    findAppScopesByLabels(selector)
    {
        var result = [];
        for(var appLabelInfo of this.appLabels)
        {
            if (labelsMatch(appLabelInfo.labels, selector))
            {
                result.push(appLabelInfo.appScope);
            }
        }
        return result;
    }
}

class AppScope
{
    constructor(parent, name)
    {
        this._parent = parent; 

        this._name = name;

        this._item = this.namespaceScope.item.fetchByNaming("app", name);

        this._ports = {};
        this._properties = {
            'Exposed': 'No'
        }
    }

    get parent() {
        return this._parent;
    }

    get namespaceScope() {
        return this.parent;
    }

    get namespace() {
        return this.namespaceScope.item;
    }

    get name() {
        return this._name;
    }

    get item() {
        return this._item;
    }

    get ports() {
        return this._ports;
    }

    get properties() {
        return this._properties;
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
    
    fetchItem(kind, name, config)
    {
        var item = this._getItem(kind, name);
        if (!item) {
            item = this._registerItem(kind, name, config);
        }
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

    getItems(kind)
    {
        if (this._itemsDict[kind])
        {
            return _.values(this._itemsDict[kind]);
        }
        return [];
    }

    countItems(kind)
    {
        return this.getItems(kind).length;
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
        this._appScopes = {};
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
        return this.appScopes.map(x => x.item);
    }

    get appScopes() {
        return _.values(this._appScopes);
    }

    markUsedBy(dn)
    {
        this._usedBy[dn] = true;
    }
    
    registerItem(item)
    {
        this._items.push(item);
    }

    associateAppScope(appScope)
    {
        this._appScopes[appScope.name] = appScope;
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