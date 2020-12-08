import { LogicScope } from "../../scope";

export interface BaseParserExecutor 
{
    name : string;
    order : number;

    execute(scope : LogicScope) : void;
}