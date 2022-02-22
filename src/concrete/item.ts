import _ from 'the-lodash';
import { ILogger, DumpWriter } from 'the-logger';
import { ConcreteRegistry } from './registry';

import * as HashUtils from '@kubevious/helpers/dist/hash-utils';

import { ItemId, IConcreteItem, K8sConfig } from '@kubevious/helper-logic-processor';
import { makeDictId, makeGroupKey } from './utils';

export class ConcreteItem implements IConcreteItem
{
    private _registry : ConcreteRegistry;
    private _id : ItemId;
    private _rawId: string;
    private _config : K8sConfig;
    private _groupKey : string;
    private _idHash : string;
    private _configHash : string;

    constructor(registry: ConcreteRegistry, id: ItemId, config : K8sConfig)
    {
        this._registry = registry;
        this._id = id;
        this._rawId = makeDictId(id);
        this._config = config;
        this._groupKey = makeGroupKey(id);

        this._idHash = HashUtils.calculateObjectHashStr(id);
        this._configHash = HashUtils.calculateObjectHashStr(config);
    }

    get logger() : ILogger {
        return this._registry.logger;
    }

    get registry() : ConcreteRegistry{
        return this._registry;
    }

    get rawId() {
        return this._rawId;
    }
    
    get id() : ItemId {
        return this._id;
    }
    
    get groupKey() : string {
        return this._groupKey;
    }
    
    get config() : K8sConfig {
        return this._config;
    }

    get idHash() {
        return this._idHash;
    }

    get configHash() {
        return this._configHash;
    }

    matchesFilter(idFilter? : Record<string, any>) : boolean
    {
        if (!this.id) {
            return false;
        }
        // if (!_.isObject(this.id)) {
        //     return false;
        // }
        if (!idFilter) {
            return true;
        }
        // TODO: VALIDATE THIS!
        // if (!_.isObject(idFilter)) {
        //     return false;
        // }
        for(const key of _.keys(idFilter!)) {
            const filterVal = idFilter[key];
            const idVal = _.get(this.id, key);
            if (!_.isEqual(filterVal, idVal)) {
                return false;
            }
        }
        return true;
    }

    debugOutputToFile(writer : DumpWriter)
    {
        writer.indent();

        writer.write('ID:');
        writer.indent();
        writer.write(this.id);
        writer.unindent();

        if (this.config && (_.keys(this.config).length > 0))
        {
            writer.write('Config:');
            writer.indent();
            writer.write(this.config);
            writer.unindent();
        }

        writer.unindent();
    }

    dump() {
        const result : Record<any, any> = {
            id: this.id
        }
        if (this.config) {
            result.config = this.config;
        }
        return result;
    }
}