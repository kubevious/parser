import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { LogicItem } from './item';
import { LogicScope } from './scope';
import { InfraScope } from './scope/infra';
import { ConcreteItem } from '../concrete/item';
import { Helpers } from './helpers';
import { PropertiesBuilder } from './properties-builder'
import { ItemScope } from './scope/item';

export interface BaseParserBuilder {
    _extract() : BaseParserInfo
}

export interface BaseParserInfo
{
    targetKind: string;
    order: number;
}

export interface ParserInfo extends BaseParserInfo
{
    target?: null | ConcreteTarget | ConcreteTarget[];

    needAppScope?: boolean;
    canCreateAppIfMissing? : boolean;
    appNameCb?: (item : LogicItem) => string;

    kind?: string,
    needNamespaceScope?: boolean,

    handler? : (args : ConcreteHandler) => void;
}

interface ConcreteTarget {
    api: string,
    kind: string
}

export interface ConcreteHandler {
    logger : ILogger;
    scope : LogicScope;
    item : ConcreteItem;
    createK8sItem : (parent : LogicItem, params : any) => void;
    infraScope : InfraScope;
    helpers : Helpers;
}

export class ConcreteParserExecutor
{
    private _parserInfo : ParserInfo;
    private _item : ConcreteItem;
    private _scope : LogicScope;

    private _createdItems : LogicItem[] = [];
    private _createdAlerts : {kind : string,
        severity : string,
        msg : string }[] = [];

    constructor(parserInfo : ParserInfo, targetItem: ConcreteItem, scope: LogicScope)
    {
        this._parserInfo = parserInfo;
        this._item = targetItem;
        this._scope = scope;
    }

    get item() : ConcreteItem {
        return this._item;
    }

    propertiesBuilder() {
        return new PropertiesBuilder(this.item.config);
    }

    hasCreatedItems() {
        return this._createdItems.length > 0;
    }

    createItem(parent : LogicItem, name : string, params : any)
    {
        params = params || {};
        params.kind = params.kind || this._parserInfo.kind;
        if (_.isFunction(params.kind)) {
            params.kind = params.kind(this._item);
        }
        if (!params.kind) {
            throw new Error("Missing handler or params kind.")
        }
        let newObj = parent.fetchByNaming(params.kind, name);
        if (params.order) {
            newObj.order = params.order;
        }
        this._createdItems.push(newObj);
        return newObj;
    }

    createK8sItem(parent : LogicItem, params : any)
    {
        params = params || {};
        var name = params.name || this._item.config.metadata.name;
        var newObj = this.createItem(parent, name, params);
        this._scope.setK8sConfig(newObj, this.item.config);
        return newObj;
    }

    createAlert(kind : string, severity : string, msg : string) {
        this._createdAlerts.push({
            kind,
            severity,
            msg
        });
    }

    determineSharedFlag(itemScope : ItemScope) 
    {
        if (itemScope.isUsedByMany)
        {
            for(let xItem of itemScope.usedBy)
            {
                xItem.setFlag("shared");
                for(let otherItem of itemScope.usedBy)
                {
                    if (otherItem.dn != xItem.dn) {
                        xItem.setUsedBy(otherItem.dn);
                    }
                }
            }
        } 
    }

}

export function ConcreteParser() : ConcreteParserBuilder
{
    return new ConcreteParserBuilder();
}

export class ConcreteParserBuilder implements BaseParserBuilder
{
    private _data : ParserInfo = {
        targetKind: 'concrete',
        order: 0
    };

    constructor()
    {
    }

    target(value : null | ConcreteTarget | ConcreteTarget[])
    {
        this._data.target = value;
        return this;
    }

    order(value : number) : ConcreteParserBuilder
    {
        this._data.order = value;
        return this;
    }

    needAppScope(value : boolean) : ConcreteParserBuilder
    {
        this._data.needAppScope = value;
        return this;
    }

    canCreateAppIfMissing(value : boolean) : ConcreteParserBuilder
    {
        this._data.canCreateAppIfMissing = value;
        return this;
    }

    appNameCb(value : (item : LogicItem) => string) : ConcreteParserBuilder
    {
        this._data.appNameCb = value;
        return this;
    }

    kind(value : string) : ConcreteParserBuilder
    {
        this._data.kind = value;
        return this;
    }

    needNamespaceScope(value : boolean) : ConcreteParserBuilder
    {
        this._data.needNamespaceScope = value;
        return this;
    }

    handler(value : (args : ConcreteHandler) => void)
    {
        this._data.handler = value;
        return this;
    }

    _extract() : ParserInfo
    {
        return this._data;
    }
}