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

interface LogicTarget {
    path: string[],
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
