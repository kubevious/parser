const Promise = require('the-promise');
const _ = require('the-lodash');

class K8sParser
{
    constructor(context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("K8sParser");
        this._groups = require("./api-groups.js");
    }

    getAPIGroups() {
        return _.cloneDeep(this._groups);
    }

    parse(isPresent, obj)
    {
        var id = this._extractId(obj);

        if (isPresent) {
            this._context.concreteRegistry.add(id, obj);
        } else {
            this._context.concreteRegistry.remove(id);
        }
    }

    _extractId(obj)
    {
        var id = {};
        id.infra = "k8s";
        id.api = obj.apiVersion.split('/')[0];
        id.kind = obj.kind;
        if (obj.metadata.namespace) {
            id.namespace = obj.metadata.namespace;
        }
        id.name = obj.metadata.name;
        return id;
    }

}

module.exports = K8sParser;