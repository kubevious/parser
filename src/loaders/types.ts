import { ApiResourceStatus } from '@kubevious/data-models';
import { Context } from '../context';
export interface ILoader
{
    run(context: Context) : any; 
    close() : any; 
    setupReadyHandler(handler : ReadyHandler) : void;
    extractApiStatuses() : ApiResourceStatus[];
}

export type ReadyHandler = (isReady : boolean) => void;
