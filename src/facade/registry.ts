import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { Context } from '../context';

import { JobDampener } from '@kubevious/helpers';
import { ConcreteRegistry } from '../concrete/registry';
import { ApiResourceStatus } from '../loaders/types';
import { ItemId, K8sConfig } from '@kubevious/helper-logic-processor';

export class FacadeRegistry
{
    private _context : Context;
    private _logger : ILogger;

    private _jobDampener : JobDampener<ConcreteRegistry>;

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("FacadeRegistry");

        this._jobDampener = new JobDampener<ConcreteRegistry>(this._logger.sublogger("FacadeDampener"), this._processConcreteRegistry.bind(this));

        this._context.concreteRegistry.onChanged(this._handleConcreteRegistryChange.bind(this));
    }

    get logger() {
        return this._logger;
    }

    private _processConcreteRegistry(data: ConcreteRegistry, date: Date)
    {
        this._logger.info("[_processConcreteRegistry] Date: %s. item count: %s", date.toISOString(), data.allItems.length);

        this._extractApiStatuses();

        this._context.k8sParser.debugOutputSummary();

        const capacity = data.outputAndExtractCapacity();
        this._context.worldvious.acceptCounters(capacity);

        return this._context.reporter.process(data, date);
    }

    private _handleConcreteRegistryChange()
    {
        this._logger.info("[_handleConcreteRegistryChange]");

        this._jobDampener.acceptJob(this._context.concreteRegistry, new Date());
    }

    handleAreLoadersReadyChange()
    {
        this._logger.info("[handleAreLoadersReadyChange] ");
        this._handleConcreteRegistryChange();
    }

    private _extractApiStatuses()
    {
        this._logger.info("[_extractApiStatuses]");

        const statuses : ApiResourceStatus[] = _.flatten(this._context.loaders.map(x => x.extractApiStatuses()));

        for(let status of statuses)
        {
            if (!this._context.apiSelector.isEnabled(status.apiName, status.apiVersion, status.kindName))
            {
                status.isSkipped = true;
            }
        }

        const finalStatuses = _.chain(statuses)
            .orderBy([x => x.apiName, x => x.apiVersion, x => x.kindName])
            .value();


        // this._logger.info("[_extractApiStatuses] finalStatuses: ", finalStatuses);

        const id : ItemId = {
            synthetic: true,
            infra: 'k8s',
            api: 'kubevious.io',
            version: 'v1',
            kind: 'ApiResourceStatus',
            name: 'default'
        } 

        const obj : K8sConfig = {
            synthetic: true,
            apiVersion: `${id.api}/${id.version}`,
            kind: id.kind,
            metadata: {
                name: id.name
            },
            config: {
                resources: finalStatuses
            }
        }

        // this.logger.info("CLUSTER API INFO: ", obj);
        
        this._context.concreteRegistry.add(id, obj);
    }
}
