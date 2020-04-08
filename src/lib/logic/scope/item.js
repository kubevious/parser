const _ = require('the-lodash');

class ItemScope
{
    constructor(parent, config)
    {
        this._parent = parent;
        this._usedBy = {};
        this._owners = {};
        this._config = config;
        this._items = [];
        this._appScopes = {};
    }

    get config() {
        return this._config;
    }

    get usedByDns() {
        return _.keys(this._usedBy);
    }

    get usedBy() {
        return _.values(this._usedBy);
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


    get owners() {
        return _.values(this._owners);
    }

    get ownerCount() {
        return this.owners.length;
    }

    get hasNoOwner() {
        return this.ownerCount == 0;
    }

    get hasOneOwner() {
        return this.ownerCount == 1;
    }

    get hasManyOwners() {
        return this.ownerCount > 1;
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

    markUsedBy(item)
    {
        this._usedBy[item.dn] = item;
    }
    
    registerItem(item)
    {
        this._items.push(item);
    }

    registerOwnerItem(item)
    {
        this._owners[item.dn] = item;
    }

    associateAppScope(appScope)
    {
        this._appScopes[appScope.name] = appScope;
    }
}

module.exports = ItemScope;