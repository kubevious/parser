const _ = require('the-lodash');
const ItemsScope = require('./items');

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

module.exports = InfraScope;