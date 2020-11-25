const _ = require("the-lodash");

module.exports = {
    targetKind: 'logic',

    target: {
        path: ["ns", "app", "netpols"]
    },

    order: 112,

    kind: "netpols",

    handler: ({logger, scope, item, itemScope, createK8sItem}) =>
    {
        let properties = {
            
        };

        for(let direction of ['Ingress', 'Egress'])
        {
            processDirection(direction);
        }

        item.addProperties({
            kind: "key-value",
            id: "properties",
            title: "Properties",
            order: 5,
            config: properties
        });


        /*****/

        function processDirection(direction)
        {
            properties[direction] = false;

            let trafficTable = {
                headers: [
                    {
                        id: 'dn',
                        label: 'Application',
                        kind: 'shortcut'
                    },
                    "ports",
                    "access",
                    {
                        id: 'policy',
                        label: 'Policy',
                        kind: 'shortcut'
                    }
                ],
                rows: []
            }

            let cidrTrafficTable = {
                headers: [
                    {
                        id: 'target'
                    },
                    "ports",
                    "access",
                    {
                        id: 'policy',
                        label: 'Policy',
                        kind: 'shortcut'
                    }
                ],
                rows: []
            }

            for(let child of item.getChildren())
            {
                let childProperties = child.getProperties('properties');
                if (childProperties)
                {
                    if (childProperties.config[direction])
                    {
                        properties[direction] = true;
                    }
                }

                let childTrafficTable = child.getProperties(`${direction.toLowerCase()}-app`);
                if (childTrafficTable)
                {
                    for(let row of childTrafficTable.config.rows)
                    {
                        let myRule = _.clone(row);
                        myRule.policy = child.id;
                        trafficTable.rows.push(myRule);
                    }
                }

                let childCidrTrafficTable = child.getProperties(`${direction.toLowerCase()}-cidr`);
                if (childCidrTrafficTable)
                {
                    for(let row of childCidrTrafficTable.config.rows)
                    {
                        let myRule = _.clone(row);
                        myRule.policy = child.id;
                        cidrTrafficTable.rows.push(myRule);
                    }
                }
            }

            if (trafficTable.rows.length > 0) {
                item.addProperties({
                    kind: "table",
                    id: `${direction.toLowerCase()}-app`,
                    title: `${direction} Application Rules`,
                    order: 8,
                    config: trafficTable
                });
            }

            if (cidrTrafficTable.rows.length > 0) {
                item.addProperties({
                    kind: "table",
                    id: `${direction.toLowerCase()}-cidr`,
                    title: `${direction} CIDR Rules`,
                    order: 8,
                    config: cidrTrafficTable
                });
            }

            if (properties[direction])
            {
                if ((trafficTable.rows.length + cidrTrafficTable.rows.length) == 0) {
                    properties[direction + ' Blocked'] = true;
                }
            }
        }

    }
}