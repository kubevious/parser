import { ApiResourceStatus } from '@kubevious/data-models';
export interface ILoader
{
    run() : any; 
    close() : any; 
    setupReadyHandler(handler : ReadyHandler) : void;
    extractApiStatuses() : ApiResourceStatus[];
}

export type ReadyHandler = (isReady : boolean) => void;
