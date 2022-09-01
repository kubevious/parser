import { K8sApiResourceStatus } from '@kubevious/entity-meta';
import { Context } from '../context';

export interface ILoader
{
    run(context: Context) : any; 
    close() : any; 
    setupReadyHandler(handler : ReadyHandler) : void;
    extractApiStatuses() : K8sApiResourceStatus[];
}

export type ReadyHandler = (isReady : boolean) => void;
