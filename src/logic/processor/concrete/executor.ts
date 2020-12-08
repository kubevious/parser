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

import { ConcreteProcessorHandlerArgs, ConcreteProcessorRuntimeArgs } from './handler-args';

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

        let runtimeArgs : ConcreteProcessorRuntimeArgs =
            {
                // namespaceScope?: Namesp;
                // app?: LogicItem;
                // appScope?: AppScope;
            };

        let handlerArgs = new ConcreteProcessorHandlerArgs(
            this._processor,
            scope,
            item,
            this._parserInfo,
            runtimeArgs
        )

        // var handlerArgs = {
        //     scope: scope,
        //     logger: this.logger,
        //     context: this._context,
        //     helpers: this._helpers,

        //     createdItems: [],
        //     createdAlerts: []
        // }

        // _.defaults(handlerArgs, target);

        // this._preprocessHandler(handlerInfo, handlerArgs);

        // this.parserInfo.

        try
        {
            this._parserInfo.handler!(handlerArgs);
            // handlerInfo.handler(handlerArgs);
        }
        catch(reason)
        {
            this._logger.error("Error in %s parser. ", this.path, reason);
        }

        // for(var alertInfo of handlerArgs.createdAlerts)
        // {
        //     for(var createdItem of handlerArgs.createdItems)
        //     {
        //         createdItem.addAlert(
        //             alertInfo.kind, 
        //             alertInfo.severity, 
        //             alertInfo.msg);
        //     }
        // }
    }


    private _preprocessHandler(runtimeArgs : ConcreteProcessorRuntimeArgs, handlerArgs : ConcreteProcessorHandlerArgs) //handlerInfo, handlerArgs
    {
        runtimeArgs.namespaceName = null;
        
        if (this._parserInfo.targetKind == 'concrete' || this._parserInfo.targetKind == 'logic')
        {
            if (this._parserInfo.needNamespaceScope || this._parserInfo.needAppScope)
            {
                if (this._parserInfo.namespaceNameCb) {
                    runtimeArgs.namespaceName = this._parserInfo.namespaceNameCb(handlerArgs.item);
                } else {
                    runtimeArgs.namespaceName = handlerArgs.item.config.metadata.namespace;
                }
                if (_.isNotNullOrUndefined(runtimeArgs.namespaceName))
                {
                    runtimeArgs.namespaceScope = handlerArgs.scope.getNamespaceScope(runtimeArgs.namespaceName!);
                }
            }
        }

        runtimeArgs.appName = null;
        if (this._parserInfo.appNameCb) {
            runtimeArgs.appName = this._parserInfo.appNameCb(handlerArgs.item);
        }
        if (runtimeArgs.namespaceName && runtimeArgs.namespaceScope)
        {
            if (this._parserInfo.needAppScope && runtimeArgs.appName)
            {
                let appScope = handlerArgs.namespaceScope.getAppAndScope(
                    runtimeArgs.appName!,
                    this._parserInfo.canCreateAppIfMissing!);

                if (appScope) {
                    runtimeArgs.appScope = appScope;
                    runtimeArgs.app = appScope.item;
                }
            }
        }
    }

}
