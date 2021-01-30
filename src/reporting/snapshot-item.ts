import _ from 'the-lodash';

import { ConcreteItem } from '../concrete/item';
import { ItemId } from '../concrete/types';

export class SnapshotItem
{
    private _idHash : string;
    private _configHash : string;
    private _id : ItemId;
    private _config : any;

    constructor(item: ConcreteItem)
    {
        this._idHash = item.idHash;
        this._configHash = item.configHash;
        this._id = item.id;
        this._config = item.config;
    }

    get id() : ItemId {
        return this._id;
    }
    
    get config() : any {
        return this._config;
    }

    get idHash() {
        return this._idHash;
    }

    get configHash() {
        return this._configHash;
    }

}