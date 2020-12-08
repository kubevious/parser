import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { LogicItem } from './item';
import { LogicScope } from './scope';
import { InfraScope } from './scope/infra';
import { ConcreteItem } from '../concrete/item';
import { Helpers } from './helpers';
import { PropertiesBuilder } from './properties-builder'
import { ItemScope } from './scope/item';
import { NamespaceScope } from './scope/namespace';
import { AppScope } from './scope/app';
import { Context } from '../context';

export interface BaseParserBuilder {
    _extract() : BaseParserInfo[]
}

export interface BaseParserInfo
{
    targetKind: string;
    order: number;
    target?: any;
}

export interface ConcreteParserInfo extends BaseParserInfo
{
    target: null | ConcreteTarget;

    needAppScope?: boolean;
    canCreateAppIfMissing? : boolean;
    appNameCb?: (item : ConcreteItem) => string;

    kind?: string,

    needNamespaceScope?: boolean,
    namespaceNameCb? : (item : ConcreteItem) => string;

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
    createK8sItem : (parent : LogicItem, params? : any) => LogicItem;
    infraScope : InfraScope;
    helpers : Helpers;

    namespaceScope: NamespaceScope;

    app: LogicItem;
    appScope: AppScope;
}

// export class ConcreteParserExecutor
// {
//     private _parserInfo : ConcreteParserInfo;
//     private _item : ConcreteItem;
//     private _scope : LogicScope;

//     private _createdItems : LogicItem[] = [];
//     private _createdAlerts : {kind : string,
//         severity : string,
//         msg : string }[] = [];

//     constructor(parserInfo : ConcreteParserInfo, targetItem: ConcreteItem, scope: LogicScope)
//     {
//         this._parserInfo = parserInfo;
//         this._item = targetItem;
//         this._scope = scope;
//     }

//     get logger() : ILogger {
//         return this._scope.logger;
//     }

//     get scope() : LogicScope {
//         return this._scope;
//     }

//     get item() : ConcreteItem {
//         return this._item;
//     }

//     propertiesBuilder() {
//         return new PropertiesBuilder(this.item.config);
//     }

//     hasCreatedItems() {
//         return this._createdItems.length > 0;
//     }

//     createItem(parent : LogicItem, name : string, params : any) : LogicItem
//     {
//         params = params || {};
//         params.kind = params.kind || this._parserInfo.kind;
//         if (_.isFunction(params.kind)) {
//             params.kind = params.kind(this._item);
//         }
//         if (!params.kind) {
//             throw new Error("Missing handler or params kind.")
//         }
//         let newObj = parent.fetchByNaming(params.kind, name);
//         if (params.order) {
//             newObj.order = params.order;
//         }
//         this._createdItems.push(newObj);
//         return newObj;
//     }

//     createK8sItem(parent : LogicItem, params? : any) : LogicItem
//     {
//         params = params || {};
//         var name = params.name || this._item.config.metadata.name;
//         var newObj = this.createItem(parent, name, params);
//         this._scope.setK8sConfig(newObj, this.item.config);
//         return newObj;
//     }

//     createAlert(kind : string, severity : string, msg : string) {
//         this._createdAlerts.push({
//             kind,
//             severity,
//             msg
//         });
//     }

//     determineSharedFlag(itemScope : ItemScope) 
//     {
//         if (itemScope.isUsedByMany)
//         {
//             for(let xItem of itemScope.usedBy)
//             {
//                 xItem.setFlag("shared");
//                 for(let otherItem of itemScope.usedBy)
//                 {
//                     if (otherItem.dn != xItem.dn) {
//                         xItem.setUsedBy(otherItem.dn);
//                     }
//                 }
//             }
//         } 
//     }

// }

export function ConcreteParser() : ConcreteParserBuilder
{
    return new ConcreteParserBuilder();
}

export class ConcreteParserBuilder implements BaseParserBuilder
{
    private _data : ConcreteParserInfo = {
        targetKind: 'concrete',
        order: 0,
        target: null
    };

    private _targets : (ConcreteTarget | null)[] = [];

    constructor()
    {
    }

    target(value : null | ConcreteTarget)
    {
        this._targets.push(value);
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

    appNameCb(value : (item : ConcreteItem) => string) : ConcreteParserBuilder
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


    namespaceNameCb(value : (item : ConcreteItem) => string) : ConcreteParserBuilder
    {
        this._data.namespaceNameCb = value;
        return this;
    }

    handler(value : (args : ConcreteHandler) => void)
    {
        this._data.handler = value;
        return this;
    }

    _extract() : ConcreteParserInfo[]
    {
        return this._targets.map(target => {
            let data = _.clone(this._data);
            data.target = target;
            return data;
        });
    }
}



interface LogicTarget {
    path: string[],
}

export function LogicParser() : LogicParserBuilder
{
    return new LogicParserBuilder();
}

export interface LogicHandler {
    logger : ILogger;
    scope : LogicScope;
    item : LogicItem;
    context: Context;
    // item : ConcreteItem;

    createItem(parent : LogicItem, name : string, params : any) : LogicItem;
    createAlert(kind : string, severity : string, msg : string) : void;

    // createK8sItem : (parent : LogicItem, params? : any) => LogicItem;
    // infraScope : InfraScope;
    // helpers : Helpers;

    namespaceScope: NamespaceScope;

    // app: LogicItem;
    // appScope: AppScope;
}

export interface LogicParserInfo extends BaseParserInfo
{
    target?: LogicTarget;

    // needAppScope?: boolean;
    // canCreateAppIfMissing? : boolean;
    // appNameCb?: (item : LogicItem) => string;

    // kind?: string,
    needNamespaceScope?: boolean,

    handler? : (args : LogicHandler) => void;
}

export class LogicParserBuilder implements BaseParserBuilder
{
    private _data : LogicParserInfo = {
        targetKind: 'logic',
        order: 0
    };

    private _targets : (LogicTarget)[] = [];

    constructor()
    {
    }

    target(value : LogicTarget) : LogicParserBuilder
    {
        this._targets.push(value);
        return this;
    }

    order(value : number) : LogicParserBuilder
    {
        this._data.order = value;
        return this;
    }

    needNamespaceScope(value : boolean) : LogicParserBuilder
    {
        this._data.needNamespaceScope = value;
        return this;
    }

    handler(value : (args : LogicHandler) => void) : LogicParserBuilder
    {
        this._data.handler = value;
        return this;
    }

    _extract() : LogicParserInfo[]
    {
        return this._targets.map(target => {
            let data = _.clone(this._data);
            data.target = target;
            return data;
        });
    }
}
