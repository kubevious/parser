import _ from 'the-lodash';
import { LogicParser } from '../parser-builder';

export default LogicParser()
    .order(20)
    .target({
        path: ["infra", "nodes"]
    })
    .handler(({ item, infraScope, helpers }) => {

        var nodesResourcesProps : Record<string, any> = {
        }
        var perNodeResources : Record<string, any> = {}
        for(var metric of helpers.resources.METRICS) {
            nodesResourcesProps[metric] = { allocatable: 0, capacity: 0 };
            perNodeResources[metric] = null;
        }

        for(var node of item.getChildrenByKind('node'))
        {
            var nodeProps = node.getProperties('resources');
            if (nodeProps)
            {
                for(var metric of helpers.resources.METRICS)
                {
                    for(var counter of _.keys(nodeProps.config[metric]))
                    {
                        var value = nodeProps.config[metric][counter];
                        nodesResourcesProps[metric][counter] += value;
                    }

                    var value = nodeProps.config[metric]['allocatable'];
                    if (value)
                    {
                        if (perNodeResources[metric] != null)
                        {
                            perNodeResources[metric] = Math.min(perNodeResources[metric], value);
                        }
                        else
                        {
                            perNodeResources[metric] = value;
                        }
                    }
                }
            }
        }

        var nodeResourcesProps : Record<string, any> = {}
        for(var metric of helpers.resources.METRICS)
        {
            if (perNodeResources[metric] == null)
            {
                perNodeResources[metric] = 0;
            }
            nodeResourcesProps[metric] = {
                'per node': perNodeResources[metric]
            }
        }

        infraScope.setNodeResources(perNodeResources);

        item.addProperties({
            kind: "resources",
            id: "cluster-resources",
            title: "Cluster Resources",
            order: 7,
            config: nodesResourcesProps
        });

        item.addProperties({
            kind: "resources",
            id: "node-resources",
            title: "Node Resources",
            order: 8,
            config: nodeResourcesProps
        });


        var clusterAllocatableResources : Record<string, any> = {}
        for(var metric of helpers.resources.METRICS)
        {
            clusterAllocatableResources[metric] = nodesResourcesProps[metric].allocatable;
        }
        infraScope.setClusterResources(clusterAllocatableResources);

    })
    ;