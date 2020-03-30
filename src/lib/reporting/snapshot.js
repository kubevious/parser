const _ = require('the-lodash');
const crypto = require('crypto');

class Snapshot
{
    constructor(date)
    {
        this._date = date;
        this._items = {};
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

    setDate(date) {
        this._date = date;
    }
    
    addItem(item)
    {
        var hash = this._makeHash(item);
        this._items[hash] = item;
    }

    _makeHash(item)
    {
        var str = _.stableStringify(item);

        const sha256 = crypto.createHash('sha256');
        sha256.update(str);
        var value = sha256.digest('hex');
        return value;
    }

}

module.exports = Snapshot;