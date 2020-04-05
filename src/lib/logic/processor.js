const _ = require("the-lodash");
const fs = require("fs");
const path = require("path");
const Scope = require("./scope");

class LogicProcessor 
{
    constructor(context)
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

    _extractProcessors(location, targetKind)
    {
        this.logger.info('[_extractProcessors] location: %s, targetKind: %s', location, targetKind);
        var files = fs.readdirSync(path.join(__dirname, location));
        files = _.filter(files, x => x.endsWith('.js'));

        var processors = []
        for(var x of files)
        {
            this.logger.info('[_extractProcessors] %s', x);
            this._loadProcessor(x, location, targetKind, processors);
        }

        processors = _.orderBy(processors, [
            x => x.order,
            x => _.stableStringify(x.target)
        ]);

        for(var x of processors)
        {
            this._processors.push(x);
        }

        for(var handlerInfo of processors)
        {
            this._logger.info("[_extractProcessors] HANDLER: %s -> %s, target:", 
                handlerInfo.order, 
                handlerInfo.name, 
                handlerInfo.target)
        }
    }

    _loadProcessor(name, location, targetKind, list)
    {
        this.logger.info('[_loadProcessor] %s...', name);
        const parserModule = require('./' + location + '/' + name);

        var targets = [];
        if (parserModule.target) {
            if (_.isArray(parserModule.target)) {
                targets = parserModule.target;
            } else {
                targets = [parserModule.target];
            }
        }

        for(var target of targets)
        {
            this.logger.info('[_loadProcessor] Adding %s...', name, target);

            var parser = _.clone(parserModule);
            if (_.isNullOrUndefined(parser.order)) {
                parser.order = 0;
            }
            if (!parser.targetKind) {
                parser.targetKind = targetKind;
            }
            parser.target = target;
            list.push(parser);
        }
    }

    process()
    {
        try
        {
            this._logger.info("[process] BEGIN");

            var scope = new Scope(this._context);
    
            this._processParsers(scope);
            this._propagete(scope);
    
            this._logger.info("[process] READY");
    
            this._context.facadeRegistry.acceptLogicItems(scope.extractItems());
    
            this._logger.info("[process] END");
    
            return this._dumpToFile(scope);
        }
        catch(reason)
        {
            this._logger.error("[process] ", reason);
        }
    }

    _processParsers(scope)
    {
        for(var handlerInfo of this._processors)
        {
            this._processParser(scope, handlerInfo);
        }
    }

    _processParser(scope, handlerInfo)
    {
        this._logger.debug("[_processParser] Handler: %s -> %s, target: %s :: ", 
            handlerInfo.order, 
            handlerInfo.name, 
            handlerInfo.targetKind,
            handlerInfo.target);

        var items = [];
        if (handlerInfo.targetKind == 'concrete') {
            items = this._context.concreteRegistry.filterItems(handlerInfo.target);
        } else if (handlerInfo.targetKind == 'logic') {
            var path = _.clone(handlerInfo.target.path);
            items = this._extractTreeItems(scope, path);
        }

        if (items)
        {
            for(var item of items)
            {
                this._processHandler(scope, handlerInfo, item);
            }
        }
    }

    _processHandler(scope, handlerInfo, item)
    {
        this._logger.silly("[_processHandler] Handler: %s, Item: %s", 
            handlerInfo.name, 
            item.id);

        var handlerArgs = {
            scope: scope,
            logger: this.logger,
            item: item,
            context: this._context,

            createdItems: [],
            createdAlerts: []
        }

        handlerArgs.hasCreatedItems = () => {
            return handlerArgs.createdItems.length > 0;
        }

        handlerArgs.createItem = (parent, name, params) => {
            params = params || {};
            params.kind = params.kind || handlerInfo.kind;
            if (!params.kind) {
                throw new Error("Missing handler or params kind.")
            }
            var newObj = parent.fetchByNaming(params.kind, name);
            if (params.order) {
                newObj.order = params.order;
            }
            handlerArgs.createdItems.push(newObj);
            return newObj;
        }

        handlerArgs.createK8sItem = (parent, params) => {
            params = params || {};
            var name = params.name || item.config.metadata.name;
            var newObj = handlerArgs.createItem(parent, name, params);
            scope.setK8sConfig(newObj, item.config);
            return newObj;
        }

        handlerArgs.createAlert = (kind, severity, date, msg) => {
            handlerArgs.createdAlerts.push({
                kind,
                severity,
                date,
                msg
            });
        }

        handlerArgs.determineSharedFlag = (itemScope) => {
            if (itemScope.isUsedByMany)
            {
                for(var xItem of itemScope.usedBy)
                {
                    xItem.setFlag("shared");
                    for(var otherItem of itemScope.usedBy)
                    {
                        if (otherItem.dn != xItem.dn) {
                            xItem.setUsedBy(otherItem.dn);
                        }
                    }
                }
            } 
        }

        this._preprocessHandler(handlerInfo, handlerArgs);

        try
        {
            handlerInfo.handler(handlerArgs);
        }
        catch(reason)
        {
            this.logger.error("Error in %s parser. ", handlerInfo.name, reason);
        }

        for(var alertInfo of handlerArgs.createdAlerts)
        {
            for(var createdItem of handlerArgs.createdItems)
            {
                createdItem.addAlert(
                    alertInfo.kind, 
                    alertInfo.severity, 
                    alertInfo.date, 
                    alertInfo.msg);
            }
        }
    }

    _preprocessHandler(handlerInfo, handlerArgs)
    {
        handlerArgs.infraScope = handlerArgs.scope.getInfraScope();

        handlerArgs.namespaceName = null;
        if (handlerInfo.needNamespaceScope || handlerInfo.needAppScope)
        {
            if (handlerInfo.namespaceNameCb) {
                handlerArgs.namespaceName = handlerInfo.namespaceNameCb(handlerArgs.item);
            } else {
                handlerArgs.namespaceName = handlerArgs.item.config.metadata.namespace;
            }
            if (handlerArgs.namespaceName)
            {
                handlerArgs.namespaceScope = handlerArgs.scope.getNamespaceScope(handlerArgs.namespaceName);
            }
        }

        handlerArgs.appName = null;
        if (handlerInfo.appNameCb) {
            handlerArgs.appName = handlerInfo.appNameCb(handlerArgs.item);
        }
        if (handlerArgs.namespaceName && handlerArgs.namespaceScope)
        {
            if (handlerInfo.needAppScope)
            {
                handlerArgs.appInfo = handlerArgs.namespaceScope.getAppAndScope(
                    handlerArgs.appName,
                    handlerInfo.canCreateAppIfMissing);

                if (handlerArgs.appInfo) {
                    handlerArgs.appScope = handlerArgs.appInfo;
                    handlerArgs.app = handlerArgs.appInfo.item;
                }
        
            }
        }
    }

    _extractTreeItems(scope, path)
    {
        var items = [];
        this._visitTree(scope.root, 0, path, item => {
            items.push(item);
        });
        return items;
    }

    _visitTree(item, index, path, cb)
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

    _propagete(scope)
    {
        this._traverseTreeBottomsUp(scope, this._propagateFlags.bind(this));
    }

    _propagateFlags(node)
    {
        this.logger.silly("[_propagateFlags] %s...", node.dn)

        if (node.hasFlag('radioactive')) 
        {
            if (node.parent) 
            {
                node.parent.setFlag('radioactive');
            }
        }
    }

    _traverseTree(scope, cb)
    {
        var col = [scope.root];
        while (col.length)
        {
            var node = col.shift();
            cb(node);
            col.unshift(...node.getChildren());
        }
    }

    _traverseTreeBottomsUp(scope, cb)
    {
        var col = [];
        this._traverseTree(scope, x => {
            col.push(x);
        })

        for(var i = col.length - 1; i >= 0; i--)
        {
            var node = col[i];
            cb(node);
        }
    }

    _dumpToFile(scope)
    {
        return Promise.resolve()
            .then(() => {
                var writer = this.logger.outputStream("dump-logic-tree");
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
            .then(() => {
                var writer = this.logger.outputStream("exported-tree");
                if (writer) {
                    writer.write(this._context.facadeRegistry.logicTree);
                    return writer.close();
                }
            });
    }


}

module.exports = LogicProcessor;