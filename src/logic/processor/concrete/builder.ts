import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { LogicItem } from '../../item';
import { LogicScope } from '../../scope';
import { InfraScope } from '../../scope/infra';
import { ConcreteItem } from '../../../concrete/item';
import { Helpers } from '../../helpers';
import { NamespaceScope } from '../../scope/namespace';
import { AppScope } from '../../scope/app';
import { Context } from '../../../context';

import { BaseParserInfo, BaseParserBuilder } from '../base/builder';


export interface ConcreteParserInfo extends BaseParserInfo
{
    target: null | ConcreteTarget;

    needAppScope?: boolean;
    canCreateAppIfMissing? : boolean;
    appNameCb?: (item : ConcreteItem) => string;

    kind?: string;

    needNamespaceScope?: boolean;
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
