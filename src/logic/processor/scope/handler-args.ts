import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../../../context';

import { LogicProcessor } from '../';

import { LogicScope } from "../../scope";
import { InfraScope } from '../../scope/infra';
import { NamespaceScope } from '../../scope/namespace';
import { AppScope } from '../../scope/app';

import { Helpers } from '../../helpers';
import { LogicItem } from '../../item';

import { ScopeParserInfo } from './builder'

import { AlertInfo } from '../types';
import { ItemScope } from '../../scope/item';

export class ScopeProcessorHandlerArgs
{
    private _processor: LogicProcessor;
    private _scope : LogicScope;
    private _itemScope: ItemScope | null;
    private _namespaceScope: NamespaceScope | null;
    private _parserInfo : ScopeParserInfo;
    private _variableArgs : ScopeProcessorVariableArgs;
    private _runtimeData : ScopeProcessorRuntimeData;

    constructor(processor: LogicProcessor, scope : LogicScope, itemScope: ItemScope | null, namespaceScope: NamespaceScope | null, parserInfo : ScopeParserInfo, variableArgs: ScopeProcessorVariableArgs, runtimeData : ScopeProcessorRuntimeData)
    {
        this._processor = processor;
        this._scope = scope;
        this._itemScope = itemScope;
        this._namespaceScope = namespaceScope;
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

    get itemScope() : ItemScope | null {
        return this._itemScope;
    }

    get namespaceScope() : NamespaceScope | null {
        return this._namespaceScope;
    }

    get infraScope() : InfraScope {
        return this._scope.getInfraScope();
    }

    get helpers() : Helpers {
        return this._processor.helpers;
    }

    hasCreatedItems() {
        return this._runtimeData.createdItems.length > 0;
    }

    createItem(parent : LogicItem, name : string, params : any) : LogicItem
    {
        params = params || {};
        params.kind = params.kind || this._parserInfo.kind;
        if (_.isFunction(params.kind)) {
            params.kind = params.kind(this._itemScope);
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

    createK8sItem(parent : LogicItem, params? : any) : LogicItem
    {
        if (!this._itemScope) {
            throw new Error("NO ITEM SCOPE PRESENT");
        }
        params = params || {};
        var name = params.name || this._itemScope!.config.metadata.name;
        var newObj = this.createItem(parent, name, params);
        this._scope.setK8sConfig(newObj, this._itemScope!.config);
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

}


export interface ScopeProcessorVariableArgs
{
    // namespaceName? : string | null;
    // namespaceScope? : NamespaceScope | null;

    // appName? : string | null;
    // appScope?: AppScope | null;
    // app?: LogicItem | null;
}


export interface ScopeProcessorRuntimeData
{
    createdItems : LogicItem[];
    createdAlerts : AlertInfo[];
}
