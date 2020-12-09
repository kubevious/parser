const logger = require('../src/logger');
logger.info("init");

const Context = require("../src/lib/context");
const context = new Context(logger);

context.setupServer();

const K8sClient = require('../src/node_modules/k8s-super-client');
return K8sClient.connect(logger, {
    server: 'http://127.0.0.1',
    token: '',
    httpAgent: {

    }
})
.then(client => {
    const Loader = require('../src/lib/loaders/k8s');
    var loader = new Loader(context,
        client,
        {});
    context.addLoader(loader);
    
    context.run();
})
.catch(reason => {
    logger.error("ERROR: ", reason);
})

