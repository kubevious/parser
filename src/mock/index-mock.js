const logger = require('../logger');
logger.info("init");

const Context = require("../lib/context");
const context = new Context(logger);

context.setupServer();

var mockDirName = 'data';
var myArgs = process.argv.slice(2);
if (myArgs.length > 0) {
    mockDirName = myArgs[0];
}
const MockLoader = require('../lib/loaders/k8s-mock');
var loader = new MockLoader(context, mockDirName);
context.addLoader(loader);

context.run();


