const Promise = require('the-promise');
const _ = require('lodash');
const EventDampener = require('kubevious-helpers').EventDampener;
const ConcreteItem = require('./item');

class ConcreteRegistry
{
    constructor(context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("ConcreteRegistry");
        this._flatItemsDict = {};
        this._itemsKindDict = {};

        this._changeEvent = new EventDampener(this._logger);

        this.onChanged(() => {
            return this.debugOutputToFile();
        })
    }

    get logger() {
        return this._logger;
    }

    get allItems() {
        return _.values(this._flatItemsDict);
    }

    reset()
    {
        this._flatItemsDict = {};
        this._itemsKindDict = {};
        this._triggerChange();
    }

    add(id, obj)
    {
        this.logger.verbose("[add] ", id);

        var rawId = this._makeDictId(id);
        var item = new ConcreteItem(this, id, obj);

        this._flatItemsDict[rawId] = item;

        if (!this._itemsKindDict[item.groupKey]) {
            this._itemsKindDict[item.groupKey] = {}
        }
        this._itemsKindDict[item.groupKey][rawId] = item;

        this._triggerChange();
    }

    remove(id)
    {
        this.logger.verbose("[remove] %s", id);

        var rawId = this._makeDictId(id);

        var item = this._flatItemsDict[rawId];
        if (item) {
            delete this._itemsKindDict[item.groupKey][rawId];
            if (!_.keys(this._itemsKindDict[item.groupKey]).length == 0)
            {
                delete this._itemsKindDict[item.groupKey];
            }

            delete this._flatItemsDict[rawId];

            this._triggerChange();
        }
    }

    _triggerChange()
    {
        this.logger.debug("[_triggerChange]");
        this._changeEvent.trigger();
    }

    findById(id)
    {
        var rawId = this._makeDictId(id);
        var item = this._flatItemsDict[rawId];
        if (item) {
            return item;
        }
        return null;
    }

    filterItems(idFilter) {
        var result = [];
        for(var item of this.allItems) {
            if (item.matchesFilter(idFilter)) {
                result.push(item);
            }
        }
        return result;
    }

    _makeDictId(id) {
        if (_.isString(id)) {
            return id;
        }
        return _.stableStringify(id);
    }

    onChanged(cb)
    {
        return this._changeEvent.on(cb);
    }
    
    extractCapacity()
    {
        var cap = [];
        for(var groupKey of _.keys(this._itemsKindDict))
        {
            cap.push({
                id: groupKey,
                count: _.keys(this._itemsKindDict[groupKey]).length
            });
        }
        cap = _.orderBy(cap, ['count', 'id'], ['desc', 'asc']);
        return cap;
    }

    debugOutputCapacity()
    {
        this.logger.info("[concreteRegistry] >>>>>>>");
        this.logger.info("[concreteRegistry] Total Count: %s", _.keys(this._flatItemsDict).length);

        const caps = this.extractCapacity();
        for(let x of caps)
        {
            this.logger.info("[concreteRegistry] %s :: %s", x.id, x.count);
        }

        this.logger.info("[concreteRegistry] <<<<<<<");
    }

    debugOutputToFile()
    {
        var writer = this.logger.outputStream("dump-concrete-registry");
        if (!writer) {
            return Promise.resolve();
        }

        this.logger.info("[debugOutputToFile] BEGIN");

        var ids = _.keys(this._flatItemsDict);
        ids.sort();
        for(var id of ids) {
            writer.write('-) ' + id);
            var item = this._flatItemsDict[id];
            item.debugOutputToFile(writer);
            writer.write();
        }

        writer.write();
        writer.write();
        writer.write("******************************************");
        writer.write("******************************************");
        writer.write("******************************************");
        writer.write();
        writer.write();

        return Promise.resolve(writer.close())
            .then(() => {
                this.logger.info("[debugOutputToFile] END");
            });
    }

    dump() {
        var result = {};
        var ids = _.keys(this._flatItemsDict);
        ids.sort();
        for(var id of ids) {
            var item = this._flatItemsDict[id];
            result[id] = item.dump();
        }
        return result;
    }
}

module.exports = ConcreteRegistry;