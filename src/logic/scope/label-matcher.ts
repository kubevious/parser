import _ from 'the-lodash';

export class LabelMatcher
{
    private _labels : { labels : any, target : any }[] = [];

    constructor()
    {
    }

    register(labels : Record<string, any>, target : any)
    {
        if (!labels) {
            labels = {};
        }
        this._labels.push({
            labels: labels,
            target: target
        });
    }

    match(selector: Record<string, any>)
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

function labelsMatch(labels: Record<string, any>, selector: Record<string, any>)
{
    for(var key of _.keys(selector)) {
        if (selector[key] != labels[key]) {
            return false;
        }
    }
    return true;
}

