import _ from 'the-lodash';

const crypto = require('crypto');

export class Snapshot
{
    private _date : any;
    private _items : Record<string, any> = {};

    constructor(date : any)
    {
        this._date = date;
    }

    get date() : any {
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

    hasKey(id : string) {
        if (this._items[id]) {
            return true;
        }
        return false;
    }

    getById(id: string) {
        let item = this._items[id];
        if (item) {
            return item;
        }
        return null;
    }

    setDate(date: any) {
        this._date = date;
    }
    
    addItem(item: any)
    {
        let hash = this._makeHash(item);
        this._items[hash] = item;
    }

    extractSnapshot()
    {
        return this.keys.map(x => ({
            hash: x,
            data: this._items[x]
        }))
    }

    extractDiff(snapshot : Snapshot)
    {
        let result = [];

        for(let newKey of this.keys)
        {
            if (!snapshot.hasKey(newKey))
            {
                result.push({
                    hash: newKey,
                    present: true,
                    data: this.getById(newKey)
                });
            }
        }

        for(let oldKey of snapshot.keys)
        {
            if (!this.hasKey(oldKey))
            {
                result.push({
                    hash: oldKey,
                    present: false
                });
            }
        }

        return result;
    }

    _makeHash(item: any)
    {
        let str = _.stableStringify(item);

        const sha256 = crypto.createHash('sha256');
        sha256.update(str);
        let value = sha256.digest('hex');
        return value;
    }

}