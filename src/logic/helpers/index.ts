import { RoleHelper } from './roles'
import { ResourceHelpers } from './resources'

export class Helpers {

    public roles : RoleHelper = new RoleHelper();
    public resources : ResourceHelpers = new ResourceHelpers();

    constructor() {

    }
}