const _ = require('the-lodash');
const ItemScope = require('./item');

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

module.exports = ItemsScope;
