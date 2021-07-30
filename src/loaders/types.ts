export interface ILoader
{
    run() : any; 
    close() : any; 
    setupReadyHandler(handler : ReadyHandler) : void;
    extractApiStatuses() : ApiResourceStatus[];
}

export interface ApiResourceStatus
{
    apiName: string | null;
    apiVersion: string;
    kindName: string;
    
    isDisabled?: boolean;
    isSkipped?: boolean;
    isDisconnected?: boolean;

    error?: ApiResourceError;
}

export interface ApiResourceError
{
    code?: number;
    message?: string;
}

export type ReadyHandler = (isReady : boolean) => void;
