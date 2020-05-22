const _ = require('the-lodash');

class ItemScope
{
    constructor(parent, kind, name, config)
    {
        this._parent = parent;
        this._kind = kind;
        this._name = name;
        this._usedBy = {};
        this._owners = {};
        this._config = config;
        this._data = {};
        this._items = [];
        this._appScopes = {};
    }

    get parent() {
        return this._parent;
    }

    get kind() {
        return this._kind;
    }

    get name() {
        return this._name;
    }

    get config() {
        return this._config;
    }

    get data() {
        return this._data;
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

    addProperties(props)
    {
        for(var item of this.items)
        {
            item.addProperties(props);
        }
    }

    setFlag(flag, params)
    {
        for(var item of this.items)
        {
            item.setFlag(flag, params);
        }
    }

    setPropagatableFlag(flag)
    {
        for(var item of this.items)
        {
            item.setPropagatableFlag(flag);
        }
    }
    
}

module.exports = ItemScope;