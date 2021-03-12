import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { ApiGroup, API_GROUPS } from './api-groups'

import { ItemId, extractK8sConfigId } from '@kubevious/helper-logic-processor'
import { KubernetesObject } from 'k8s-super-client/dist/types';


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

    parse(isPresent: boolean, obj: KubernetesObject)
    {
        let id = this._extractId(obj);

        if (isPresent) {
            this._context.concreteRegistry.add(id, obj);
        } else {
            this._context.concreteRegistry.remove(id);
        }
    }

    private _extractId(obj: KubernetesObject) : ItemId
    {
        return extractK8sConfigId(obj);
    }

}
