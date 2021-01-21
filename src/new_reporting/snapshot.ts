import _ from 'the-lodash';
import { ConcreteItem } from '../concrete/item';

import { SnapshotItem } from './snapshot-item';

export class Snapshot
{
    private _date : Date;
    private _items : Record<string, SnapshotItem> = {};
    private _configHasheDict: Record<string, SnapshotItem> = {};

    constructor(date : Date)
    {
        this._date = date;
    }

    get date() {
        return this._date;
    }

    get count() {
        return _.keys(this._items).length;
    }

    get keys() {
        return _.keys(this._items);
    }

    get items() {
        return _.values(this._items);
    }

    hasIdHash(id : string) {
        if (this._items[id]) {
            return true;
        }
        return false;
    }

    getByIdHash(hash: string) : SnapshotItem | null {
        let item = this._items[hash];
        if (item) {
            return item;
        }
        return null;
    }

    getByConfigHash(hash: string) : SnapshotItem | null {
        let item = this._configHasheDict[hash];
        if (item) {
            return item;
        }
        return null;
    }

    addItem(item: ConcreteItem)
    {
        let snapshotItem = new SnapshotItem(item);
        this._items[snapshotItem.idHash] = snapshotItem;
        this._configHasheDict[snapshotItem.configHash] = snapshotItem;
    }

    extractDiff(snapshot : Snapshot)
    {
        let result : DiffItem[] = [];

        for(let newIdHash of this.keys)
        {
            let newItem = this.getByIdHash(newIdHash)!;

            let oldItem = snapshot.getByIdHash(newIdHash);
            if (oldItem)
            {
                if (oldItem.configHash != newItem.configHash)
                {
                    result.push({
                        idHash: newIdHash,
                        present: true,
                        configHash: newItem.configHash
                    });
                }
            }
            else
            {
                result.push({
                    idHash: newIdHash,
                    present: true,
                    configHash: newItem.configHash
            });
            }
        }

        for(let oldKey of snapshot.keys)
        {
            if (!this.hasIdHash(oldKey))
            {
                result.push({
                    idHash: oldKey,
                    present: false
                });
            }
        }

        return result;
    }

}

export interface DiffItem
{
    idHash: string
    present: boolean
    configHash?: string
}