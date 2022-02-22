import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { EventDampener, Handler } from '@kubevious/helpers/dist/event-dampener';

import { ConcreteItem } from './item';
import { ItemId, K8sConfig } from '@kubevious/helper-logic-processor';
import { ApiGroupInfo } from 'k8s-super-client';
import { makeDictId, makeGroupKey } from './utils';

export class ConcreteRegistry
{
    private _logger : ILogger;

    private _flatItemsDict : Record<any, ConcreteItem> = {};
    private _itemsKindDict : Record<any, Record<any, ConcreteItem>> = {};

    private _changeEvent : EventDampener;

    constructor(logger : ILogger)
    {
        this._logger = logger.sublogger("ConcreteRegistry");

        this._changeEvent = new EventDampener(this.logger);

        this.onChanged(() => {
            return this.debugOutputToFile();
        })
    }

    get logger() : ILogger {
        return this._logger;
    }

    get date() {
        return new Date();
    }

    get allItems() : ConcreteItem[] {
        return _.values(this._flatItemsDict);
    }

    reset()
    {
        this._flatItemsDict = {};
        this._itemsKindDict = {};
        this.triggerChange();
    }

    add(id: ItemId, obj: K8sConfig)
    {
        this.logger.verbose("[add] ", id);

        const item = new ConcreteItem(this, id, obj);

        this._flatItemsDict[item.rawId] = item;

        if (!this._itemsKindDict[item.groupKey]) {
            this._itemsKindDict[item.groupKey] = {}
        }
        this._itemsKindDict[item.groupKey][item.rawId] = item;

        this.triggerChange();
    }

    remove(id: ItemId)
    {
        this.logger.verbose("[remove] %s", id);

        const item = this._flatItemsDict[makeDictId(id)];
        if (item) {

            const groupDict = this._itemsKindDict[item.groupKey];
            if (groupDict) {
                delete groupDict[item.rawId];
                if (_.keys(groupDict).length !== 0)
                {
                    delete this._itemsKindDict[item.groupKey];
                }
            } else {
                this.logger.warn("[remove] Failed to remove kind group key %s for %s", item.groupKey, item.rawId);
            }

            delete this._flatItemsDict[item.rawId];

            this.triggerChange();
        }
    }

    removeApi(apiGroup : ApiGroupInfo)
    {
        this.logger.info("[removeApi] ", apiGroup);

        const itemId : ItemId = {
            infra: 'k8s',
            api: apiGroup.api,
            apiName: apiGroup.apiName,
            version: apiGroup.apiVersion,
            kind: apiGroup.kindName,
            name: ''
        }

        const groupKey = makeGroupKey(itemId);

        const groupDict = this._itemsKindDict[groupKey];
        if (groupDict) {
            for(const item of _.values(groupDict))
            {
                delete this._flatItemsDict[item.rawId];
            }

            delete this._itemsKindDict[groupKey];

            this.triggerChange();
        }
    }

    triggerChange()
    {
        this.logger.debug("[triggerChange]");
        this._changeEvent.trigger();
    }

    filterItems(idFilter: any) : ConcreteItem[] {
        const result : ConcreteItem[] = [];
        for(const item of this.allItems) {
            if (item.matchesFilter(idFilter)) {
                result.push(item);
            }
        }
        return result;
    }

    onChanged(cb: Handler)
    {
        return this._changeEvent.on(cb);
    }

    private _extractCapacity() : CapacityCounter[]
    {
        let cap : CapacityCounter[] = [];
        for(const groupKey of _.keys(this._itemsKindDict))
        {
            cap.push({
                name: groupKey,
                count: _.keys(this._itemsKindDict[groupKey]).length
            });
        }
        cap = _.orderBy(cap, ['count', 'name'], ['desc', 'asc']);
        return cap;
    }

    outputAndExtractCapacity() : CapacityCounter[]
    {
        this.logger.info("[concreteRegistry] >>>>>>>");
        this.logger.info("[concreteRegistry] Total Count: %s", _.keys(this._flatItemsDict).length);

        const counters = this._extractCapacity();
        for(const x of counters)
        {
            this.logger.info("[concreteRegistry] %s :: %s", x.name, x.count);
        }

        this.logger.info("[concreteRegistry] <<<<<<<");

        return counters;
    }


    debugOutputToFile()
    {
        const writer = this.logger.outputStream("dump-concrete-registry");
        if (!writer) {
            return Promise.resolve();
        }

        this.logger.info("[debugOutputToFile] BEGIN");

        const ids = _.keys(this._flatItemsDict);
        ids.sort();
        for(const id of ids) {
            writer.write('-) ' + id);
            const item = this._flatItemsDict[id];
            item.debugOutputToFile(writer);
            writer.newLine();
        }

        writer.newLine();
        writer.newLine();
        writer.write("******************************************");
        writer.write("******************************************");
        writer.write("******************************************");
        writer.newLine();
        writer.newLine();

        return Promise.resolve(writer.close())
            .then(() => {
                this.logger.info("[debugOutputToFile] END");
            });
    }

    dump() {
        const result : Record<any, any> = {};
        const ids = _.keys(this._flatItemsDict);
        ids.sort();
        for(const id of ids) {
            const item = this._flatItemsDict[id];
            result[id] = item.dump();
        }
        return result;
    }
}


interface CapacityCounter 
{
    name: string,
    count: number
}