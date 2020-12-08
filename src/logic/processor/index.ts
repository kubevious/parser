import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { Context } from '../../context';

const fs = require("fs");
const path = require("path");

import { LogicScope } from "../scope";

import { Helpers } from '../helpers';
import { LogicItem } from '../item';

import { BaseParserBuilder } from './base/builder'
import { ConcreteParserInfo } from './concrete/builder'
import { LogicParserInfo } from './logic/builder'

import { BaseParserExecutor } from './base/executor';
import { ConcreteParserExecutor } from './concrete/executor';
import { LogicParserExecutor } from './logic/executor';


export class LogicProcessor 
{
    private _context : Context;
    private _logger : ILogger;

    private _helpers : Helpers = new Helpers();
    private _processors : BaseParserExecutor[] = [];

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("LogicProcessor");

        this._extractProcessors('parsers', 'concrete');
        this._extractProcessors('polishers', 'logic');
    }

    get logger() {
        return this._logger;
    }

    get context() {
        return this._context;
    }

    get helpers() : Helpers {
        return this._helpers;
    }

    private _extractProcessors(location : string, defaultTargetKind : string)
    {
        this.logger.info('[_extractProcessors] location: %s, defaultTargetKind: %s', location, defaultTargetKind);
        let files : string[] = fs.readdirSync(path.join(__dirname, location));
        files = _.filter(files, x => x.endsWith('.d.ts'));

        for(var fileName of files)
        {
            this.logger.info('[_extractProcessors] %s', fileName);
            let moduleName = fileName.replace('.d.ts', '');
            this._loadProcessor(moduleName, location);
        }

        this._processors = _.orderBy(this._processors, [
            x => x.order,
            x => x.name,
            x => x.targetInfo
        ]);

        for(var processorInfo of this._processors)
        {
            this._logger.info("[_extractProcessors] HANDLER: %s -> %s, target:", 
                processorInfo.order, 
                processorInfo.name);
        }
    }

    private _loadProcessor(name : string, location : string)
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
        let baseParserInfos = baseParserBuilder._extract();

        for (let baseParserInfo of baseParserInfos)
        {
            if (baseParserInfo.targetKind == 'concrete')
            {
                let parserInfo = <ConcreteParserInfo>baseParserInfo;
                let parserExecutor = new ConcreteParserExecutor(
                    this,
                    moduleName,
                    parserInfo)
                this._processors.push(parserExecutor);
            }
            else if (baseParserInfo.targetKind == 'logic')
            {
                let parserInfo = <LogicParserInfo>baseParserInfo;
                let parserExecutor = new LogicParserExecutor(
                    this,
                    moduleName,
                    parserInfo)
                this._processors.push(parserExecutor);
            }
        }

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

    private _runLogic(scope : LogicScope, tracker : any)
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

    private _processParsers(scope : LogicScope)
    {
        for(var handlerInfo of this._processors)
        {
            this._processParser(scope, handlerInfo);
        }
    }

    private _processParser(scope: LogicScope, handlerInfo : BaseParserExecutor)
    {
        this._logger.debug("[_processParser] Handler: %s -> %s, target: %s :: ", 
            handlerInfo.order,
            handlerInfo.name);

        handlerInfo.execute(scope);

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
    }

    private _finalizeScope(scope : LogicScope)
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

