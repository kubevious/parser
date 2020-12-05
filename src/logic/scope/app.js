const _ = require('the-lodash');

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

    get containerItems() {
        return this.item.getChildrenByKind('cont');
    }

    get initContainerItems() {
        return this.item.getChildrenByKind('initcont');
    }

    get allContainerItems() {
        return _.union(this.initContainerItems, this.containerItems);
    }
}

module.exports = AppScope;