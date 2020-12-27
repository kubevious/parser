import _ from 'the-lodash';
import { PropertyValueWithUnit } from '../helpers/resources';
import { LogicParser } from '../parser-builder';

export default LogicParser()
    .order(20)
    .target({
        path: ["infra", "storage"]
    })
    .handler(({ item, infraScope, helpers }) => {

        let classProps : Record<string, PropertyValueWithUnit> = {
            'Capacity': { value: 0, unit: 'bytes' },
        }

        for(let pv of item.getChildrenByKind('storclass'))
        {
            let pvProps = pv.getProperties('properties');
            if (pvProps)
            {
                {
                    let value = <PropertyValueWithUnit> pvProps!.config['Capacity'];
                    if (value) {
                        classProps['Capacity'].value += value.value;
                    }
                }
            }
        }

        item.addProperties({
            kind: "key-value",
            id: "properties",
            title: "Properties",
            order: 10,
            config: classProps
        });

    })
    ;