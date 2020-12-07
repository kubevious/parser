import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { Context } from '../context';

const fs = require("fs");
const path = require("path");

import { LogicScope } from "./scope";
import { PropertiesBuilder } from './properties-builder';

import { Helpers } from './helpers';
import { LogicItem } from './item';

import { BaseParserBuilder, BaseParserInfo } from './parser-builder'

class ProcessorInfo 
{
    public path : string;
    public parserInfo : BaseParserInfo;

    constructor(path : string, parserInfo : BaseParserInfo)
    {
        this.path = path;
        this.parserInfo = parserInfo;
    }
}


export class LogicProcessor 
{
    private _context : Context;
    private _logger : ILogger;

    private _helpers : Helpers = new Helpers();
    private _processors : ProcessorInfo[] = [];

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("LogicProcessor");

        this._processors = [];
        this._extractProcessors('parsers', 'concrete');
        this._extractProcessors('polishers', 'logic');
    }

    get logger() {
        return this._logger;
    }

    // TODO: FIX!
    _extractProcessors(location : string, defaultTargetKind : string)
    {
        this.logger.info('[_extractProcessors] location: %s, defaultTargetKind: %s', location, defaultTargetKind);
        let files : string[] = fs.readdirSync(path.join(__dirname, location));
        files = _.filter(files, x => x.endsWith('.d.ts'));

        let processors : ProcessorInfo[] = []
        for(var fileName of files)
        {
            this.logger.info('[_extractProcessors] %s', fileName);
            let moduleName = fileName.replace('.d.ts', '');
            this._loadProcessor(moduleName, location, defaultTargetKind, processors);
        }

        this._processors = _.orderBy(processors, [
            x => x.parserInfo.order,
            x => x.path,
            // x => _.stableStringify(x.target)
        ]);

        for(var processorInfo of this._processors)
        {
            this._logger.info("[_extractProcessors] HANDLER: %s -> %s, target:", 
                processorInfo.parserInfo.order, 
                processorInfo.path);
            // /processorInfo.target)
        }
    }

    _loadProcessor(name : string, location : string, defaultTargetKind : string, list : ProcessorInfo[])
    {
        this.logger.info('[_loadProcessor] %s...', name);
        const moduleName = location + '/' + name;
        const modulePath = './' + moduleName;
        const parserModule = require(modulePath);

        let defaultExport = parserModule.default;
        if (!defaultExport) {
            this.logger.error("Invalid Parser: %s", modulePath);
            throw new Error("Invalid Parser: " + modulePath);
            return;
        }

        let baseParserBuilder = <BaseParserBuilder>defaultExport;
        let baseParserInfo = baseParserBuilder._extract();

        let processorInfo = new ProcessorInfo(moduleName, baseParserInfo);
        list.push(processorInfo);

        // console.log(baseParserInfo);

        // TODO: Fix ME;
        // var targets = [];
        // if (!_.isUndefined(parserModule.target)) {
        //     if (_.isArray(parserModule.target)) {
        //         targets = parserModule.target;
        //     } else {
        //         targets = [parserModule.target];
        //     }
        // }

        // for(var target of targets)
        // {
        //     this.logger.info('[_loadProcessor] Adding %s...', name, target);

        //     var parser = _.clone(parserModule);
        //     parser.name = location + '/' + name;
            
        //     if (_.isNullOrUndefined(parser.order)) {
        //         parser.order = 0;
        //     }
        //     if (!parser.targetKind) {
        //         parser.targetKind = defaultTargetKind;
        //     }
        //     parser.target = target;
        //     list.push(parser);
        // }
    }

    process()
    {
        return this._context.tracker.scope("Logic::process", (tracker : any) => {

            var scope = new LogicScope(this._context);

            return Promise.resolve()
                .then(() => this._runLogic(scope, tracker))
                .then(() => this._report(scope, tracker))
                .then(() => this._dumpToFile(scope))

        })
        .catch((reason : any) => {
            this._logger.error("[process] ", reason);
        });
    }

    _runLogic(scope : LogicScope, tracker : any)
    {
        return tracker.scope("runLogic", () => {
            this._context.concreteRegistry.debugOutputCapacity();

            this._processParsers(scope);
            this._finalizeScope(scope);
            this._propagete(scope);

            scope.debugOutputCapacity();
        })
    }

    _report(scope : LogicScope, tracker : any)
    {
        return tracker.scope("report", () => {
            return this._context.facadeRegistry.acceptLogicItems(scope.extractItems());
        });
    }

    _processParsers(scope : LogicScope)
    {
        for(var handlerInfo of this._processors)
        {
            // TODO: FIX
            // this._processParser(scope, handlerInfo);
        }
    }

    // _processParser(scope: LogicScope, handlerInfo)
    // {
    //     this._logger.debug("[_processParser] Handler: %s -> %s, target: %s :: ", 
    //         handlerInfo.order, 
    //         handlerInfo.name, 
    //         handlerInfo.targetKind,
    //         handlerInfo.target);

    //     var targets = [];
    //     if (handlerInfo.targetKind == 'concrete') {
    //         var items = this._context.concreteRegistry.filterItems(handlerInfo.target);
    //         targets = items.map(x => ({ id: x.id, item: x }));
    //     } else if (handlerInfo.targetKind == 'logic') {
    //         var path = _.clone(handlerInfo.target.path);
    //         var items = this._extractTreeItems(scope, path);
    //         targets = items.map(x => ({ id: x.dn, item: x }));
    //     } else if (handlerInfo.targetKind == 'scope') {
    //         if (handlerInfo.target.namespaced) {
    //             var items = scope.getNamespaceScopes();
    //             if (handlerInfo.target.scopeKind) {
    //                 items = _.flatten(items.map(x => x.items.getAll(handlerInfo.target.scopeKind)))
    //                 targets = items.map(x => ({ id: 'scope-item-' + x.kind + '-' + x.name, itemScope: x, item: x }));
    //             } else {
    //                 targets = items.map(x => ({ id: 'scope-ns-' + x.name, namespaceScope: x, item: x }));
    //             }
    //         } else {
    //             var items = scope.getInfraScope().items.getAll(handlerInfo.target.scopeKind);
    //             targets = items.map(x => ({ id: 'scope-item-' + x.kind + '-' + x.name, itemScope: x, item: x }));
    //         }
    //     }

    //     if (targets)
    //     {
    //         for(var target of targets)
    //         {
    //             this._processHandler(scope, handlerInfo, target);
    //         }
    //     }
    // }

    // _processHandler(scope : LogicScope, handlerInfo, target)
    // {
    //     this._logger.silly("[_processHandler] Handler: %s, Item: %s", 
    //         handlerInfo.name, 
    //         target.id);

    //     var handlerArgs = {
    //         scope: scope,
    //         logger: this.logger,
    //         context: this._context,
    //         helpers: this._helpers,

    //         createdItems: [],
    //         createdAlerts: []
    //     }

    //     _.defaults(handlerArgs, target);

    //     handlerArgs.propertiesBuilder = () => {
    //         return new PropertiesBuilder(handlerArgs.item.config);
    //     }

    //     handlerArgs.hasCreatedItems = () => {
    //         return handlerArgs.createdItems.length > 0;
    //     }

    //     handlerArgs.createItem = (parent, name, params) => {
    //         params = params || {};
    //         params.kind = params.kind || handlerInfo.kind;
    //         if (_.isFunction(params.kind)) {
    //             params.kind = params.kind(target.item);
    //         }
    //         if (!params.kind) {
    //             throw new Error("Missing handler or params kind.")
    //         }
    //         var newObj = parent.fetchByNaming(params.kind, name);
    //         if (params.order) {
    //             newObj.order = params.order;
    //         }
    //         handlerArgs.createdItems.push(newObj);
    //         return newObj;
    //     }

    //     handlerArgs.createK8sItem = (parent, params) => {
    //         params = params || {};
    //         var name = params.name || target.item.config.metadata.name;
    //         var newObj = handlerArgs.createItem(parent, name, params);
    //         scope.setK8sConfig(newObj, target.item.config);
    //         return newObj;
    //     }

    //     handlerArgs.createAlert = (kind, severity, msg) => {
    //         handlerArgs.createdAlerts.push({
    //             kind,
    //             severity,
    //             msg
    //         });
    //     }

    //     handlerArgs.determineSharedFlag = (itemScope) => {
    //         if (itemScope.isUsedByMany)
    //         {
    //             for(var xItem of itemScope.usedBy)
    //             {
    //                 xItem.setFlag("shared");
    //                 for(var otherItem of itemScope.usedBy)
    //                 {
    //                     if (otherItem.dn != xItem.dn) {
    //                         xItem.setUsedBy(otherItem.dn);
    //                     }
    //                 }
    //             }
    //         } 
    //     }

    //     this._preprocessHandler(handlerInfo, handlerArgs);

    //     try
    //     {
    //         handlerInfo.handler(handlerArgs);
    //     }
    //     catch(reason)
    //     {
    //         this.logger.error("Error in %s parser. ", handlerInfo.name, reason);
    //     }

    //     for(var alertInfo of handlerArgs.createdAlerts)
    //     {
    //         for(var createdItem of handlerArgs.createdItems)
    //         {
    //             createdItem.addAlert(
    //                 alertInfo.kind, 
    //                 alertInfo.severity, 
    //                 alertInfo.msg);
    //         }
    //     }
    // }

    // _preprocessHandler(handlerInfo, handlerArgs)
    // {
    //     handlerArgs.infraScope = handlerArgs.scope.getInfraScope();

    //     handlerArgs.namespaceName = null;
    //     if (handlerInfo.targetKind == 'concrete' || handlerInfo.targetKind == 'logic')
    //     {
    //         if (handlerInfo.needNamespaceScope || handlerInfo.needAppScope)
    //         {
    //             if (handlerInfo.namespaceNameCb) {
    //                 handlerArgs.namespaceName = handlerInfo.namespaceNameCb(handlerArgs.item);
    //             } else {
    //                 handlerArgs.namespaceName = handlerArgs.item.config.metadata.namespace;
    //             }
    //             if (_.isNotNullOrUndefined(handlerArgs.namespaceName))
    //             {
    //                 handlerArgs.namespaceScope = handlerArgs.scope.getNamespaceScope(handlerArgs.namespaceName);
    //             }
    //         }
    //     }

    //     handlerArgs.appName = null;
    //     if (handlerInfo.appNameCb) {
    //         handlerArgs.appName = handlerInfo.appNameCb(handlerArgs.item);
    //     }
    //     if (handlerArgs.namespaceName && handlerArgs.namespaceScope)
    //     {
    //         if (handlerInfo.needAppScope)
    //         {
    //             handlerArgs.appInfo = handlerArgs.namespaceScope.getAppAndScope(
    //                 handlerArgs.appName,
    //                 handlerInfo.canCreateAppIfMissing);

    //             if (handlerArgs.appInfo) {
    //                 handlerArgs.appScope = handlerArgs.appInfo;
    //                 handlerArgs.app = handlerArgs.appInfo.item;
    //             }
        
    //         }
    //     }
    // }

    _extractTreeItems(scope : LogicScope, path : string[])
    {
        var items : LogicItem[] = [];
        this._visitTree(scope.root, 0, path, item => {
            items.push(item);
        });
        return items;
    }

    _visitTree(item : LogicItem, index: number, path : string[], cb : (item : LogicItem) => void)
    {
        this._logger.silly("[_visitTree] %s, path: %s...", item.dn, path);

        if (index >= path.length)
        {
            cb(item);
        }
        else
        {
            var top = path[index];
            var children = item.getChildrenByKind(top);
            for(var child of children)
            {
                this._visitTree(child, index + 1, path, cb);
            }
        }
    }

    _finalizeScope(scope : LogicScope)
    {
        scope.getInfraScope().items.finalize();
        for(var nsScope of scope.getNamespaceScopes())
        {
            nsScope.items.finalize();
        }
    }

    _propagete(scope : LogicScope)
    {
        this._traverseTreeBottomsUp(scope, this._propagateFlags.bind(this));
    }

    _propagateFlags(node : LogicItem)
    {
        this.logger.silly("[_propagateFlags] %s...", node.dn)

        if (!node.parent) {
            return;
        }

        for(var flagInfo of node.getFlags())
        {
            if (flagInfo.propagatable)
            {
                node.parent.setFlag(flagInfo.name, flagInfo);
            }
        }
    }

    _traverseTree(scope : LogicScope, cb : (item : LogicItem) => void)
    {
        let col : LogicItem[] = [scope.root];
        while (col.length)
        {
            let node = col.shift()!;
            cb(node);
            col.unshift(...node.getChildren());
        }
    }

    _traverseTreeBottomsUp(scope : LogicScope, cb : (item : LogicItem) => void)
    {
        let col : LogicItem[] = [];
        this._traverseTree(scope, x => {
            col.push(x);
        })

        for(var i = col.length - 1; i >= 0; i--)
        {
            let node = col[i];
            cb(node);
        }
    }

    _dumpToFile(scope : LogicScope)
    {
        return Promise.resolve()
            .then(() => {
                let writer = this.logger.outputStream("dump-logic-tree");
                if (writer) {
                    scope.root.debugOutputToFile(writer);
                    return writer.close();
                }
            })
            .then(() => {
                var writer = this.logger.outputStream("dump-logic-tree-detailed");
                if (writer) {
                    scope.root.debugOutputToFile(writer, { includeConfig: true });
                    return writer.close();
                }
            })
            // .then(() => {
            //     var writer = this.logger.outputStream("exported-tree");
            //     if (writer) {
            //         writer.write(this._context.facadeRegistry.logicTree);
            //         return writer.close();
            //     }
            // });
    }


}
