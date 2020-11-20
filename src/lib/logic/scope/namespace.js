const _ = require('the-lodash');
const ItemsScope = require('./items');
const AppScope = require('./app');
const LabelMatcher = require('./label-matcher');

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

        this._appLabelMatcher = new LabelMatcher();
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

    registerAppScopeLabels(appScope, labelsMap)
    {
        this._appLabelMatcher.register(labelsMap, appScope);
    }

    findAppScopesByLabels(selector)
    {
        return this._appLabelMatcher.match(selector);
    }
}

module.exports = NamespaceScope;
