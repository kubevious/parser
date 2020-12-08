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

import { ConcreteParserInfo, ConcreteHandler } from '../../parser-builder'
import { ConcreteItem } from '../../../concrete/item';

export class ConcreteProcessorHandlerArgs implements ConcreteHandler
{
    private _processor: LogicProcessor;
    private _scope : LogicScope;
    private _item: ConcreteItem;
    private _parserInfo : ConcreteParserInfo;
    private _runtimeArgs : ConcreteProcessorRuntimeArgs;

    private _createdItems : LogicItem[] = [];

    constructor(processor: LogicProcessor, scope : LogicScope, item: ConcreteItem, parserInfo : ConcreteParserInfo, runtimeArgs: ConcreteProcessorRuntimeArgs)
    {
        this._processor = processor;
        this._scope = scope;
        this._item = item;
        this._parserInfo = parserInfo;
        this._runtimeArgs = runtimeArgs;
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

    get item() : ConcreteItem {
        return this._item;
    }

    get infraScope() : InfraScope {
        return this._scope.getInfraScope();
    }

    get helpers() : Helpers {
        return this._processor.helpers;
    }

    get namespaceScope() : NamespaceScope {
        return this._runtimeArgs.namespaceScope!;
    }

    get app() : LogicItem {
        return this._runtimeArgs.app!;
    }

    get appScope() : AppScope {
        return this._runtimeArgs.appScope!;
    }

    createItem(parent : LogicItem, name : string, params : any) : LogicItem
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

    createK8sItem(parent : LogicItem, params? : any) : LogicItem
    {
        params = params || {};
        var name = params.name || this._item.config.metadata.name;
        var newObj = this.createItem(parent, name, params);
        this._scope.setK8sConfig(newObj, this.item.config);
        return newObj;
    }

}


export interface ConcreteProcessorRuntimeArgs
{
    namespaceName? : string | null;
    namespaceScope? : NamespaceScope | null;

    appName? : string | null;
    appScope?: AppScope | null;
    app?: LogicItem | null;
}
