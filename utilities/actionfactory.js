// |===================================================|
// |                     ACTION                        |
// |===================================================|
// | Executable action identified by label, consists   |
// | of an executable function, condition function     |
// | and optional update function.                     |
// |                                                   |
// | * Actions are composed of bound functions and     |
// | arguments, argument binding is delayed making     |
// | actions well suited for creating action schemas.  |
// |===================================================|

class Action {
    // id
    label;

    // initiate action on bound object
    execute;

    // terminate executing action
    condition;

    // update bound object during action execution
    update;

    // an action consists of an identifying label, an execute function,
    // a condition function, and an optional update function
    constructor(label, execute, condition, update = null) {
        this.label     = label;
        this.execute   = execute;
        this.condition = condition;
        this.update    = update;
    }

    // bind arguments to this functions execute function
    args_execute(args) {
        this.execute = this.execute.bind(null, ...args);
    }

    // bind arguments to this functions condition function
    args_condition(args) {
        this.condition = this.condition.bind(null, ...args);
    }

    // bind arguments to this functions update function
    args_update(args) {
        this.update = this.update.bind(null, ...args);
    }

    // return a copy of this action
    // * this is useful for copying an action with no arguments bound
    // * then binding arguments to the copy
    copy() {
        return new Action(this.label, this.execute, this.update, this.condition);
    }
}

// |===================================================|
// |                  ACTION FACTORY                   |
// |===================================================|
// | Register, deregister, and generate stored actions |
// | with dynamic parameters.                          |
// |===================================================|

class ActionFactory {
    // container for actions intended to be reused 
    // * actions with bound functions only (not arguments)
    schemas;

    // an action factory only consists of a schema container
    constructor() {
        this.schemas = {};
    }

    // given an object to bind to, an identifying label, execution function,
    // condition function, and optional update function create a bound action
    // and store it as a schema
    // * schemas cannot be overwritten by saving with the same label
    register(self, label, execute, condition, update = null) {
        let bound_execute = execute.bind(self);
        let bound_condition = condition.bind(self);
        let bound_update = update !== null ? update.bind(self) : null;

        this.schemas[label] ??= new Action(label, bound_execute, bound_update, bound_condition);
    }

    // remove a schema by label
    deregister(label) {
        delete this.schemas[label];
    }

    // generate an action with bound function arguments 
    // copies a saved schema, which is an action with only the calling object bound,
    // then binds the supplied arguments to each of its functions
    // * arguments are passed in as arrays
    generate(label, args_execute = null, args_condition = null, args_update = null) {
        let action = this.schemas[label].copy();
        if (args_execute !== null) {
            action.args_execute(args_execute);
        }
        if (args_condition !== null) {
            action.args_condition(args_condition);
        }
        if (args_update !== null && action.update !== null) {
            action.args_update(args_update);
        }
        return action;
    }
}

export { ActionFactory }