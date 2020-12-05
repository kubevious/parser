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
    
    register(config)
    {
        return this._register(config.kind, config.metadata.name, config);
    }

    _register(kind, name, config)
    {
        if (!this._itemsDict[kind])
        {
            this._itemsDict[kind] = {};
        }
        var item = new ItemScope(this._parent, kind, name, config);
        this._itemsDict[kind][name] = item;
        return item;
    }
    
    fetch(kind, name, config)
    {
        var item = this._get(kind, name);
        if (!item) {
            item = this._register(kind, name, config);
        }
        return item;
    }

    get(kind, name)
    {
        if (_.isPlainObject(kind))
        {
            return this._get(kind.kind, kind.metadata.name);
        }
        else
        {
            return this._get(kind, name);
        }
    }

    getAll(kind)
    {
        if (this._itemsDict[kind])
        {
            return _.values(this._itemsDict[kind]);
        }
        return [];
    }

    finalize()
    {
        for(var kindDict of _.values(this._itemsDict))
        {
            for(var scopeItem of _.values(kindDict))
            {
                scopeItem.finalize();
            }
        }
    }

    count(kind)
    {
        return this.getAll(kind).length;
    }

    _get(kind, name)
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
