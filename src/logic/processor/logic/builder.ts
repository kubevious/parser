import _ from 'the-lodash';

import { BaseParserInfo, BaseParserBuilder } from '../base/builder';

import { LogicProcessorHandlerArgs } from './handler-args';

interface LogicTarget {
    path: string[],
}

export interface LogicParserInfo extends BaseParserInfo
{
    target?: LogicTarget;

    // needAppScope?: boolean;
    // canCreateAppIfMissing? : boolean;
    // appNameCb?: (item : LogicItem) => string;

    kind?: string,
    needNamespaceScope?: boolean,

    handler? : (args : LogicProcessorHandlerArgs) => void;
}

export class LogicParserBuilder implements BaseParserBuilder
{
    private _data : LogicParserInfo = {
        targetKind: 'logic',
        order: 0
    };

    private _targets : (LogicTarget)[] = [];

    constructor()
    {
    }

    target(value : LogicTarget) : LogicParserBuilder
    {
        this._targets.push(value);
        return this;
    }

    order(value : number) : LogicParserBuilder
    {
        this._data.order = value;
        return this;
    }

    needNamespaceScope(value : boolean) : LogicParserBuilder
    {
        this._data.needNamespaceScope = value;
        return this;
    }

    kind(value : string) : LogicParserBuilder
    {
        this._data.kind = value;
        return this;
    }

    handler(value : (args : LogicProcessorHandlerArgs) => void) : LogicParserBuilder
    {
        this._data.handler = value;
        return this;
    }

    _extract() : LogicParserInfo[]
    {
        return this._targets.map(target => {
            let data = _.clone(this._data);
            data.target = target;
            return data;
        });
    }
}
