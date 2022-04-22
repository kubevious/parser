import _ from 'the-lodash';
import { ItemId } from "@kubevious/agent-middleware";

export function makeGroupKey(id: ItemId)
{
    if (id.synthetic) {
        return `synth::${id.api}:${id.kind}`;
    }
    return `${id.api}:${id.kind}`;
}

export function makeDictId(id: ItemId) : string {
    return _.stableStringify(id);
}