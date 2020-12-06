import _ from 'the-lodash';

import { LogicItem } from './item'

export type PostBuildActionFunc = (props: Record<string, any>) => Record<string, any>;

export class PropertiesBuilder
{
    private _item: LogicItem;
    private _properties : Record<string, any> = {};
    private _postBuildAction : PostBuildActionFunc;

    constructor(item: LogicItem, postBuildAction: PostBuildActionFunc)
    {
        this._item = item;
        this._properties = {};
        this._postBuildAction = postBuildAction;
    }

    fromConfig(name: string, valuePath: string, defaultValue?: any) : PropertiesBuilder
    {
        return this.fromObject(this._item.config, name, valuePath, defaultValue);
    }

    fromObject(obj: any, name: string, valuePath: string, defaultValue?: any) : PropertiesBuilder
    {
        var value = _.get(obj, valuePath);
        if (_.isUndefined(value)) {
            if (!_.isUndefined(defaultValue)) {
                value = defaultValue;
            }
        }
        if (!_.isUndefined(value)) {
            this.add(name, value);
        }
        return this;
    }

    add(name: string, value: any) : PropertiesBuilder
    {
        this._properties[name] = value;
        return this;
    }

    build() : Record<string, any>
    {
        if (this._postBuildAction) {
            return this._postBuildAction(this._properties);
        }
        return this._properties;
    }
}
