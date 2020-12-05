import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { ApiGroup, API_GROUPS } from './api-groups'

export class K8sParser
{
    private _context : Context;
    private _logger : ILogger;

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("K8sParser");
    }

    getAPIGroups() : ApiGroup[] {
        return _.cloneDeep(API_GROUPS);
    }

    parse(isPresent: boolean, obj: any)
    {
        var id = this._extractId(obj);

        if (isPresent) {
            this._context.concreteRegistry.add(id, obj);
        } else {
            this._context.concreteRegistry.remove(id);
        }
    }

    _extractId(obj: any)
    {
        let id : Record<any, any> = {};
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
