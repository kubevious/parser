const _ = require('the-lodash');

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

module.exports = ItemScope;