import { Backend } from '@kubevious/helper-backend'
import { Context } from './context'

const backend = new Backend("parser");

const context = new Context(backend);

// const LocalLoader = require('./lib/loaders/local');
// var loader = new LocalLoader(context);
// context.addLoader(loader);

context.run();
  