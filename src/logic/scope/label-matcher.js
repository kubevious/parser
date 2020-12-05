const _ = require('the-lodash');

class LabelMatcher
{
    constructor()
    {
        this._labels = [];
    }

    register(labels, target)
    {
        if (!labels) {
            labels = {};
        }
        this._labels.push({
            labels: labels,
            target: target
        });
    }

    match(selector)
    {
        var result = [];
        for(var item of this._labels)
        {
            if (labelsMatch(item.labels, selector))
            {
                result.push(item.target);
            }
        }
        return result;
    }
}

function labelsMatch(labels, selector)
{
    for(var key of _.keys(selector)) {
        if (selector[key] != labels[key]) {
            return false;
        }
    }
    return true;
}

module.exports = LabelMatcher;
