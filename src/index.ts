import { Backend } from '@kubevious/helper-backend'
import { Context } from './context'
import { LocalLoader } from './loaders/local'

const backend = new Backend("parser");

try{

const context = new Context(backend);

var loader = new LocalLoader(context);
context.addLoader(loader);
context.run();

}
catch(reason) {
    console.log(reason);
}