import _ from 'the-lodash';
import { ConcreteParser } from '../parser-builder';

export default ConcreteParser()
    .order(1)
    .target(null)
    .handler(({ logger, scope, item, createK8sItem, infraScope, helpers }) => {

        // TODO: fix me
        if (item.id.api == 'v1' && item.id.kind == 'Namespace')
        {
            let nsScope = scope.getNamespaceScope(item.id.name);
            // item.associateNamespaceScope(nsScope);
        }
        else if (item.id.namespace)
        {
            let namespaceScope = scope.getNamespaceScope(item.id.namespace);
            let itemScope = namespaceScope.items.register(item.config);
            // item.associateScope(itemScope);
        } else {
            let itemScope = scope.getInfraScope().items.register(item.config);
            // item.associateScope(itemScope);
        }

    })
    ;