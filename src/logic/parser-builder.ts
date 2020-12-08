
import { ConcreteParserBuilder } from './processor/concrete/builder';
import { LogicParserBuilder } from './processor/logic/builder';

export function ConcreteParser() : ConcreteParserBuilder
{
    return new ConcreteParserBuilder();
}

export function LogicParser() : LogicParserBuilder
{
    return new LogicParserBuilder();
}