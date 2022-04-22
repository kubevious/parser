import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { ItemId, extractK8sConfigId } from '@kubevious/agent-middleware'
import { KubernetesObject } from 'k8s-super-client';
import { ConcreteRegistry } from '../concrete/registry';
import { makeGroupKey } from '../concrete/utils';
import { K8sApiSelector } from '../loaders/api-selector';

export class K8sParser
{
    private _concreteRegistry : ConcreteRegistry;
    private _apiSelector : K8sApiSelector;
    private logger : ILogger;

    private _changeSummary : Record<string, { name: string, updated: number, deleted: number }> = {};

    constructor(context : Context)
    {
        this._concreteRegistry = context.concreteRegistry;
        this._apiSelector = context.apiSelector;
        this.logger = context.logger.sublogger("K8sParser");
    }

    parse(isPresent: boolean, obj: KubernetesObject)
    {
        obj = this._sanitize(obj);

        const id = this._extractId(obj);

        if (isPresent) {
            this._concreteRegistry.add(id, obj);
        } else {
            this._concreteRegistry.remove(id);
        }

        const groupKey = makeGroupKey(id);
        let counter = this._changeSummary[groupKey];
        if (!counter) {
            counter = { name: groupKey, updated: 0, deleted: 0};
            this._changeSummary[groupKey] = counter;
        }
        if (isPresent) {
            counter.updated++;
        } else {
            counter.deleted++;
        }
    }

    debugOutputSummary()
    {
        this.logger.info("[changeSummary] >>>>>>>");

        const changes = _.chain(this._changeSummary)
            .values()
            .orderBy([(x) => (x.deleted + x.updated), 'name'], ['desc', 'asc'])
            .value();

        for(const x of changes)
        {
            this.logger.info("[changeSummary] %s. Updated: %s, Deleted: %s", x.name, x.updated, x.deleted);
        }

        this.logger.info("[changeSummary] <<<<<<<");

        this._changeSummary = {};
    }

    private _sanitize(obj: KubernetesObject) : KubernetesObject
    {
        return this._apiSelector.sanitize(obj);
    }

    private _extractId(obj: KubernetesObject) : ItemId
    {
        return extractK8sConfigId(obj);
    }

}
