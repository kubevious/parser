import { ConcreteParser } from '../parser-builder';

export default ConcreteParser()
    .order(10)
    // .target()
    .handler(({ item, createK8sItem }) => {
    })
    ;