import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../../../context';

import { LogicProcessor } from '../';

import { LogicScope } from "../../scope";

import { ConcreteParserInfo } from './builder'
import { ConcreteItem } from '../../../concrete/item';

import { ConcreteProcessorHandlerArgs, ConcreteProcessorVariableArgs, ConcreteProcessorRuntimeData } from './handler-args';

import { BaseParserExecutor } from '../base/executor';

export class ConcreteParserExecutor implements BaseParserExecutor
{
    private _context : Context;
    private _processor : LogicProcessor;
    private _logger : ILogger;
    public path : string;

    // private _executor : ConcreteParserExecutor;
    private parserInfo : ConcreteParserInfo;
    private _parserInfo : ConcreteParserInfo;

    constructor(processor : LogicProcessor, path : string, parserInfo : ConcreteParserInfo)
    {
        this.path = path;
        this._processor = processor;
        this._logger = processor.logger;
        this._context = processor.context;
        this.parserInfo = parserInfo;
        this._parserInfo = parserInfo;
    }

    get name() : string {
        return this.path;
    }

    get order() : number {
        return this._parserInfo.order;
    }

    execute(scope : LogicScope)
    {
        let items = this._context.concreteRegistry.filterItems(this.parserInfo.target);

        for(var item of items)
        {
            this._processHandler(scope, item);
        }
    }

    _processHandler(scope : LogicScope, item: ConcreteItem)
    {
        this._logger.silly("[_processHandler] Handler: %s, Item: %s", 
            this.path, 
            item.id);

        let variableArgs : ConcreteProcessorVariableArgs =
        {
        };

        let runtimeData : ConcreteProcessorRuntimeData = {
            createdItems : [],
            createdAlerts : []
        };

        let handlerArgs = new ConcreteProcessorHandlerArgs(
            this._processor,
            scope,
            item,
            this._parserInfo,
            variableArgs,
            runtimeData
        )

        this._preprocessHandler(variableArgs, handlerArgs);

        try
        {
            this._parserInfo.handler!(handlerArgs);
        }
        catch(reason)
        {
            this._logger.error("Error in %s parser. ", this.path, reason);
        }

        this._postProcessHandler(variableArgs, handlerArgs, runtimeData);
    }

    private _preprocessHandler(variableArgs : ConcreteProcessorVariableArgs, handlerArgs : ConcreteProcessorHandlerArgs) //handlerInfo, handlerArgs
    {
        variableArgs.namespaceName = null;
        
        if (this._parserInfo.targetKind == 'concrete' || this._parserInfo.targetKind == 'logic')
        {
            if (this._parserInfo.needNamespaceScope || this._parserInfo.needAppScope)
            {
                if (this._parserInfo.namespaceNameCb) {
                    variableArgs.namespaceName = this._parserInfo.namespaceNameCb(handlerArgs.item);
                } else {
                    variableArgs.namespaceName = handlerArgs.item.config.metadata.namespace;
                }
                if (_.isNotNullOrUndefined(variableArgs.namespaceName))
                {
                    variableArgs.namespaceScope = handlerArgs.scope.getNamespaceScope(variableArgs.namespaceName!);
                }
            }
        }

        variableArgs.appName = null;
        if (this._parserInfo.appNameCb) {
            variableArgs.appName = this._parserInfo.appNameCb(handlerArgs.item);
        }
        if (variableArgs.namespaceName && variableArgs.namespaceScope)
        {
            if (this._parserInfo.needAppScope && variableArgs.appName)
            {
                let appScope = handlerArgs.namespaceScope.getAppAndScope(
                    variableArgs.appName!,
                    this._parserInfo.canCreateAppIfMissing!);

                if (appScope) {
                    variableArgs.appScope = appScope;
                    variableArgs.app = appScope.item;
                }
            }
        }
    }

    private _postProcessHandler(variableArgs : ConcreteProcessorVariableArgs, handlerArgs : ConcreteProcessorHandlerArgs, runtimeData : ConcreteProcessorRuntimeData)
    {

        for(var alertInfo of runtimeData.createdAlerts)
        {
            for(var createdItem of runtimeData.createdItems)
            {
                createdItem.addAlert(
                    alertInfo.kind, 
                    alertInfo.severity, 
                    alertInfo.msg);
            }
        }

    }

}
