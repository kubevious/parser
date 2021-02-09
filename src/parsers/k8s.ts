import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { ApiGroup, API_GROUPS } from './api-groups'

import { ItemId, K8sConfig, extractK8sConfigId } from '@kubevious/helper-logic-processor'


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

        let id = this._extractId(obj);

        if (isPresent) {
            this._context.concreteRegistry.add(id, obj);
        } else {
            this._context.concreteRegistry.remove(id);
        }
    }

    private _extractId(obj: any) : ItemId
    {
        let config = <K8sConfig> obj;
        return extractK8sConfigId(config);
    }

}
