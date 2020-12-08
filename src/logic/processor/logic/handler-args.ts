import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../../../context';

import { LogicProcessor } from '../';

import { LogicScope } from "../../scope";
import { InfraScope } from '../../scope/infra';
import { NamespaceScope } from '../../scope/namespace';
import { AppScope } from '../../scope/app';
import { ItemScope } from '../../scope/item'; 

import { Helpers } from '../../helpers';
import { LogicItem } from '../../item';

import { LogicParserInfo } from './builder'

import { AlertInfo } from '../types';

export class LogicProcessorHandlerArgs
{
    private _processor: LogicProcessor;
    private _scope : LogicScope;
    private _item: LogicItem;
    private _parserInfo : LogicParserInfo;
    private _variableArgs : LogicProcessorVariableArgs;
    private _runtimeData : LogicProcessorRuntimeData;

    constructor(processor: LogicProcessor, scope : LogicScope, item: LogicItem, parserInfo : LogicParserInfo, variableArgs: LogicProcessorVariableArgs, runtimeData : LogicProcessorRuntimeData)
    {
        this._processor = processor;
        this._scope = scope;
        this._item = item;
        this._parserInfo = parserInfo;
        this._variableArgs = variableArgs;
        this._runtimeData = runtimeData;
    }

    get logger() : ILogger {
        return this._processor.logger;
    }

    get context() : Context {
        return this._processor.context;
    }

    get scope() : LogicScope {
        return this._scope;
    }

    get item() : LogicItem {
        return this._item;
    }

    get infraScope() : InfraScope {
        return this._scope.getInfraScope();
    }

    get helpers() : Helpers {
        return this._processor.helpers;
    }

    get namespaceScope() : NamespaceScope {
        return this._variableArgs.namespaceScope!;
    }

    get namespaceName() : string {
        return this._variableArgs.namespaceName!;
    }

    get app() : LogicItem {
        return this._variableArgs.app!;
    }

    get appScope() : AppScope {
        return this._variableArgs.appScope!;
    }

    get appName() : string {
        return this._variableArgs.appName!;
    }

    hasCreatedItems() {
        return this._runtimeData.createdItems.length > 0;
    }

    createItem(parent : LogicItem, name : string, params? : any) : LogicItem
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
        this._runtimeData.createdItems.push(newObj);
        return newObj;
    }

    createAlert(kind : string, severity : string, msg : string)
    {
        this._runtimeData.createdAlerts.push({
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


export interface LogicProcessorVariableArgs
{
    namespaceName? : string | null;
    namespaceScope? : NamespaceScope | null;

    appName? : string | null;
    appScope?: AppScope | null;
    app?: LogicItem | null;
}


export interface LogicProcessorRuntimeData
{
    createdItems : LogicItem[];
    createdAlerts : AlertInfo[];
}
