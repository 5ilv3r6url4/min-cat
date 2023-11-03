"use strict";

//  ===================================================[ IMPORTS ]

import { Entity } from "./index.js"
import { ActionFactory, Projectile, Rectangle, Vector } from "../utilities/index.js"

// |===================================================|
// |                     OBSERVE                       |
// |===================================================|
// | Observe and ask questions about the game worlds   | 
// | relation to self (cat).                           |
// |===================================================|

class Observe {
    // player is observable
    _player;

    // observation data
    self;
    player;
    predict;
    boundary;

    // takes in a reference to the player, creates info objects,
    // and binds self (cat) to look as an argument
    constructor(self, player) {
        this._player = player;

        this.self     = { };
        this.player   = { };
        this.predict  = { };
        this.boundary = { left: { }, right: { }, top: { }, bottom: { } };

        this.look = this.look.bind(this, self);
    }

    // update action enumerations, player and boundary info in relation to self (cat)
    look(self) {
        // boundary info
        let points_self = self._physics.hitbox_points();
        let points = self._physics.boundary_points();

        let pos_left = Vector.add(points.a, points.b).divide(2);
        let pos_right = Vector.add(points.c, points.d).divide(2);
        let pos_top = Vector.add(points.d, points.a).divide(2);
        let pos_bottom = Vector.add(points.b, points.c).divide(2);

        // * javascript canvas renders from upper-left
        pos_right.x -= 1;
        pos_bottom.y += 1;

        let rel_left = Vector.subtract(pos_left, self._physics.midpoint);
        let rel_right = Vector.subtract(pos_right, self._physics.midpoint);
        let rel_top = Vector.subtract(pos_top, self._physics.midpoint);
        let rel_bottom = Vector.subtract(pos_bottom, self._physics.midpoint);

        // boundary collision info
        let hit_top = points_self.a.y >= pos_top.y;
        let hit_left = points_self.b.x <= pos_left.x;
        let hit_right = points_self.d.x >= pos_right.x;
        let hit_bottom = points_self.c.y <= pos_bottom.y ||
                // * run & run-to actions contain single frame non-collisions with bottom
                (self.actions.queue[0] !== undefined && self.actions.queue[0].label.includes("run"));

        // player info
        let rel_player = Rectangle.relative(this._player._physics.hitbox, self._physics.hitbox);
        let vel_player = this._player._physics.trajectory.copy();

        // prediction info
        let vel_predict = Vector.add(vel_player, this.player.vel);
        // * limit to the bounds of the boundary
        let pos_predict = Vector.add(this._player._physics.midpoint, vel_predict)
            .limit(points.a.x, points.c.x, points.b.y, points.d.y);
        let rel_predict = Vector.subtract(pos_predict, self._physics.midpoint);

        // info count of previous actions
        this.self.sit    = self.actions.history.filter(action => action.includes("sit")).length;
        this.self.idle   = self.actions.history.filter(action => action.includes("idle")).length;
        this.self.walk   = self.actions.history.filter(action => action.includes("walk")).length;
        this.self.run    = self.actions.history.filter(action => action.includes("run")).length;
        this.self.sneak  = self.actions.history.filter(action => action.includes("sneak")).length;
        this.self.attack = self.actions.history.filter(action => action.includes("attack")).length;
        this.self.wait   = self.actions.history.filter(action => action.includes("wait")).length;
        this.self.crouch = self.actions.history.filter(action => action.includes("crouch")).length;
        this.self.jump   = self.actions.history.filter(action => action.includes("jump")).length;
        this.self.land   = self.actions.history.filter(action => action.includes("land")).length;
        this.self.hang   = self.actions.history.filter(action => action.includes("hang")).length;
        this.self.climb  = self.actions.history.filter(action => action.includes("climb")).length;

        // update info object components directly
        // * it is important to update in this manner, otherwise actions will not have the correct references
        this.boundary.left.id  = "left";
        this.boundary.left.pos = pos_left;                 // position of the left wall as midpoint
        this.boundary.left.rel = rel_left;                 // self relative to left wall position
        this.boundary.left.abs = Vector.abs(rel_left);     // absolute value of relative
        this.boundary.left.dis = rel_left.length();        // distance from self to left wall
        this.boundary.left.hit = hit_left;                 // collision with left wall?
        
        this.boundary.right.id  = "right";
        this.boundary.right.pos = pos_right;               // position of the right wall as midpoint
        this.boundary.right.rel = rel_right;               // self relative to right wall position
        this.boundary.right.abs = Vector.abs(rel_right);   // absolute value of relative
        this.boundary.right.dis = rel_right.length();      // distance from self to right wall
        this.boundary.right.hit = hit_right;               // collision with right wall?

        this.boundary.top.id  = "top";
        this.boundary.top.pos = pos_top;                   // position of the ceiling as midpoint
        this.boundary.top.rel = rel_top;                   // self relative to ceiling position
        this.boundary.top.abs = Vector.abs(rel_top);       // absolute value of relative
        this.boundary.top.dis = rel_top.length();          // distance from self to ceiling
        this.boundary.top.hit = hit_top;                   // collision with ceiling?

        this.boundary.bottom.id  = "bottom";
        this.boundary.bottom.pos = pos_bottom;             // position of the floor as midpoint
        this.boundary.bottom.rel = rel_bottom;             // self relative to floor position
        this.boundary.bottom.abs = Vector.abs(rel_bottom); // absolute value of relative
        this.boundary.bottom.dis = rel_bottom.length();    // distance from self to floor
        this.boundary.bottom.hit = hit_bottom;             // collision with floor?

        this.player.toy = this._player.toy                 // player toy
        this.player.pos = this._player._physics.midpoint;  // position of the player as midpoint
        this.player.rel = rel_player;                      // self relative to player position
        this.player.abs = Vector.abs(rel_player);          // absolute value of relative
        this.player.dis = rel_player.length();             // distance from self to player
        this.player.vel = vel_player;                      // player velocity

        this.predict.toy = this._player.toy                // player toy
        this.predict.pos = pos_predict;                    // predicted position of the player
        this.predict.rel = rel_predict;                    // self relative to player predicted position
        this.predict.abs = Vector.abs(rel_predict);        // absolute value of predicted relative
        this.predict.dis = rel_predict.length();           // predicted distance from self to player
        this.predict.vel = vel_predict;                    // player velocity
    }
}

// |===================================================|
// |                    CAT                            |
// |===================================================|
// | Subclass of Entity, responsible for the cat.      |
// | Additionally includes the data necessary for      |
// | the AI; observations, actions, and difficulty.    |
// |===================================================|

class Cat extends Entity {
    // modifies action speeds and behaviors
    difficulty;

    // generates observation data ingested by the ai
    observe;

    // config file listed speeds for actions
    speeds;

    // contains factory, queue, history, and elapsed time
    actions;

    // sets initial values and binds them to the reset function, 
    // creates an instance of observe, passing self for binding,
    // creates the actions object with an instance of acton factory,
    // and registers action schemas
    // * config is found in the config file and sets initial values
    // * asset must include spritesheet and atlas
    // * audio is the global audio system shared across all entities and objects
    // * boundary is a reference to the game world boundary
    constructor(config, asset, player, audio, boundary) {
        super(config.INITIAL, asset, audio, boundary);

        this.difficulty = 0;

        // provides observation data
        this.observe = new Observe(this, player);

        this.speeds = {
            run: config.RUN_SPEED,
            walk: config.WALK_SPEED,
            sneak: config.SNEAK_SPEED,
            jump: config.JUMP_SPEED,
            min: config.JUMP_SPEED / 10,
            climb: config.CLIMB_SPEED
        };

        // stores, generates, and keeps track of actions
        this.actions = {
            factory: new ActionFactory(),
            queue: [],
            history: [config.INITIAL.action],
            elapsed: 0
        };

        // create and register action schemas with the action factory
        this.register_actions();

        // bind intial value states to reset function
        this.reset = this.reset.bind(this, config.INITIAL);
    }

    // set cat difficulty level, between 0 and 2
    set_difficulty(level) {
        this.difficulty = Math.min(2, Math.max(0, level));
    }

    // triggers observations, actions, queue shifts, updates, and planning
    logic(dt) {
        this.actions.elapsed += dt;
        this.observe.look();

        // triggers planning phase and execution when no current action queued
        let action = this.current_action();
        if (action === null) {
            this.plan();
            this.actions.queue[0].execute();
            return;
        }
        
        // shifts the actions queue to the next action when action condition met
        if (action.condition()) {
            // resets elapsed time tracker for next action
            this.actions.elapsed = 0;
            let action = this.next_action();
            // triggers planning phase and execution when no next action queued
            if (action === null) {
                this.plan();
                this.actions.queue[0].execute();
            }
            else {
                action.execute();
            }
        }
        // triggers action update function if registered
        else if (action.update !== null) {
            action.update();
        }
    }

    // returns first action of queue or null
    current_action() {
        if (this.actions.queue.length != 0 || this.actions.queue[0] !== undefined) {
            return this.actions.queue[0];
        }
        else {
            return null;
        }
    }

    // shifts the actions queue forward, storing the shifted action label in history
    // returns the new current action or null
    // * action history has a max size of 7
    next_action() {
        let action_previous = this.actions.queue.shift();
        this.actions.history.unshift(action_previous.label);
        while (this.actions.history.length > 7) {
            this.actions.history.pop();
        }
        return this.current_action();
    }

    // enqueues a new action into the actions queue
    // * optional arguments are passed as lists to the actions respective function components
    enqueue_action(label, args_execute = null, args_condition = null, args_update = null) {
        let action = this.actions.factory.generate(label, args_execute, args_condition, args_update);
        this.actions.queue.push(action);
    }

    // replaces the current action with a new action in the actions queue and executes it
    // * optional arguments are passed as lists to the actions respective function components
    change_current_action(label, args_execute = null, args_condition = null, args_update = null) {
        let action = this.actions.factory.generate(label, args_execute, args_condition, args_update);
        this.actions.queue[0] = action;
        action.execute();
    }

    // clears all future actions in the actions queue, keeping only the first
    clear_future_actions() {
        let action = this.actions.queue[0];
        this.actions.queue = [action];
    }

    // calculates sign and direction to point in the game world, 
    // either facing towards it or away
    direction(point, facing) {
        let relative = Vector.subtract(point, this._physics.midpoint);
        switch (true) {
            case facing && relative.x >= 0:
                return { facing: "right", sign: 1 };
            case facing && relative.x < 0:
                return { facing: "left", sign: -1 };
            case !facing && relative.x >= 0:
                return { facing: "left", sign: 1 };
            case !facing && relative.x < 0:
                return { facing: "right", sign: -1 };
            default:
                return { facing: "right", sign: 1 };
        }
    }

    // adds a number of actions in sequence to queue, based on behaviors
    // * decisions are separated by player zones; i.e. is the player reachable
    // * decisions use chance, action history, observation data, and difficulty
    // * harder difficulties predict player position
    plan() {
        let chance = Math.random();
        let recent_action = this.actions.history[0] || "none";
        switch (recent_action) {
            case "sit":
            case "idle":
                switch (this.difficulty) {
                    case 0: // sit & idle, easy difficulty
                        if (this.observe.player.rel.y < 20) { // zone 1
                            if (this.observe.player.rel.x < 75) {
                                this.do_attack(this.observe.player);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else if (this.observe.player.rel.y < 70) { // zone 2
                            if (this.observe.player.rel.x < 100) {
                                this.do_pounce(this.observe.player, false, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }                        
                        else { // zone 3
                            if (this.observe.player.rel.x < 100) {
                                this.do_pounce(this.observe.player, false, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        break;
                    case 1: // sit & idle, intermediate difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 125) {
                                if (this.observe.self.wait == 0) {
                                    this.do_trick(this.observe.player, "low", false);
                                }
                                else {
                                    this.do_attack(this.observe.player);
                                }
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hang(this.observe.player, "low");
                            }
                            else {
                                if (this.observe.predict.rel.x < 100) {
                                    this.do_suspense(this.observe.player, "low", true);
                                }
                                else {
                                    this.do_bounce(this.observe.player, "low");
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_pounce(this.observe.player, false, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        break;
                    case 2: // sit & idle, hard difficulty                        
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 75) {
                                this.do_attack(this.observe.predict);
                            }
                            else {
                                this.do_chase(this.observe.predict);
                            }
                        }                        
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_bounce(this.observe.predict, "low");
                            }
                            else {
                                if (this.observe.predict.rel.x < 100) {
                                    this.do_suspense(this.observe.predict, "min", false);
                                }
                                else {
                                    this.do_chase(this.observe.predict);
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_pounce(this.observe.predict, false, "low", false);
                            }
                            else {
                                this.do_hops(this.observe.predict, false, "low", "low", "low");
                            }
                        }
                        break;
                    default:
                        this.do_hops(this.observe.predict, false, "low", "low", "low");
                        break;
                }
                break;
            case "walk":
            case "run":
                switch (this.difficulty) {
                    case 0: // walk & run, easy difficulty
                        if (this.observe.player.rel.y < 20) { // zone 1
                            if (this.observe.player.rel.x < 50) {
                                this.do_sneak(this.observe.player);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        } 
                        else if (this.observe.player.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hang(this.observe.player, "low");
                            }
                            else {
                                if (this.observe.player.rel.x < 50) {
                                    this.do_sneak(this.observe.player);
                                }
                                else {
                                    this.do_pounce(this.observe.player, false, "low", true);
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.player.rel.x < 100) {
                                this.do_pounce(this.observe.player, false, "low", false);
                            }
                            else {
                                this.do_bounce(this.observe.player, "low");
                            }
                        }
                        break;
                    case 1: // walk & run, intermediate difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 75) {
                                this.do_attack(this.observe.player);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hang(this.observe.player, "low");
                            }
                            else {
                                if (this.observe.predict.rel.x < 50) {
                                    this.do_sneak(this.observe.player);
                                }
                                else {
                                    this.do_suspense(this.observe.player, "low", true);
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_trick(this.observe.player, "low", true);
                            }
                            else {
                                this.do_hops(this.observe.player, false, "low", "low", "low");
                            }
                        }
                        break;
                    case 2: // walk & run, hard difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 50) {
                                this.do_sneak(this.observe.predict);
                            }
                            else {
                                this.do_chase(this.observe.predict);
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hang(this.observe.predict, "low");
                            }
                            else {
                                if (this.observe.predict.rel.x < 100) {
                                    this.do_pounce(this.observe.predict, false, "low", false);
                                }
                                else {
                                    this.do_trick(this.observe.predict, "low", false);
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_suspense(this.observe.predict, "min", false);
                            }
                            else {
                                this.do_hops(this.observe.predict, false, "low", "low", "low");
                            }
                        }
                        break;
                    default:
                        this.do_hops(this.observe.predict, false, "low", "low", "low");
                        break;
                }
                break;
            case "sneak":
            case "attack":
                switch (this.difficulty) {
                    case 0: // sneak & attack, easy difficulty
                        if (this.observe.player.rel.y < 20) { // zone 1
                            if (this.observe.player.rel.x < 80) {
                                this.do_pounce(this.observe.player, true, "low", true);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else if (this.observe.player.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hang(this.observe.player, "low");
                            }
                            else {
                                if (this.observe.player.rel.x < 100) {
                                    this.do_pounce(this.observe.player, true, "low", true);
                                }
                                else {
                                    this.do_bounce(this.observe.player, "low");
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.player.rel.x < 100) {
                                this.do_pounce(this.observe.player, true, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        break;
                    case 1: // sneak & attack, intermediate difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 75) {
                                this.do_relax(this.observe.player);
                            }
                            else {
                                this.do_bounce(this.observe.player, "low");
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hops(this.observe.player, true, "low", "low", "low");
                            }
                            else {
                                if (this.observe.predict.rel.x < 100) {
                                    this.do_pounce(this.observe.player, true, "low", true);
                                }
                                else {
                                    this.do_suspense(this.observe.player, "low", true);
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_pounce(this.observe.player, true, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        break;
                    case 2: // sneak & attack, hard difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 100) {
                                this.do_suspense(this.observe.predict, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.predict);
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (chance < 0.7) {
                                this.do_hang(this.observe.predict, "low");
                            }
                            else {
                                if (this.observe.predict.rel.x < 100) {
                                    this.do_pounce(this.observe.predict, true, "low", true);
                                }
                                else {
                                    this.do_hops(this.observe.predict, true, "low", "low", "low");
                                }
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_trick(this.observe.predict, "min", false);
                            }
                            else {
                                this.do_pounce(this.observe.predict, true, "low", false);
                            }
                        }
                        break;
                    default:
                        this.do_relax(this.observe.player);
                        break;
                }
                break;
            case "wait":
            case "crouch":
                // wait and crouch should always be proceeded by another action
                this.do_hops(this.observe.predict, false, "low", "low", "low");
                break;
            case "jump":
                // jump should always be proceeded by hang or land
                this.do_relax(this.observe.player);
                break;
            case "land":
                switch (this.difficulty) {
                    case 0: // land, easy difficulty
                        if (this.observe.player.rel.y < 20) { // zone 1
                            if (this.observe.player.rel.x < 100) {
                                this.do_relax(this.observe.player);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else if (this.observe.player.rel.y < 70) { // zone 2
                            if (this.observe.player.rel.x < 100) {
                                if (this.observe.self.hang == 0) {
                                    this.do_hang(this.observe.player, "low");
                                }
                                else {
                                    this.do_pounce(this.observe.player, false, "low", false);
                                }
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else { // zone 3
                            if (this.observe.player.rel.x < 100) {
                                this.do_pounce(this.observe.player, false, "low", false);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        break;
                    case 1: // land, intermediate difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 50) {
                                this.do_sneak(this.observe.player);
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (this.observe.predict.rel.x < 100) {
                                if (this.observe.self.hang == 0) {
                                    this.do_hang(this.observe.player, "low");
                                }
                                else {
                                    this.do_pounce(this.observe.player, false, "low", false);
                                }
                            }
                            else {
                                this.do_chase(this.observe.player);
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_pounce(this.observe.player, false, "low", false);
                            }
                            else {
                                this.do_hops(this.observe.player, false, "low", "low", "low");
                            }
                        }
                        break;
                    case 2: // land, hard difficulty
                        if (this.observe.predict.rel.y < 20) { // zone 1
                            if (this.observe.predict.rel.x < 75) {
                                this.do_attack(this.observe.predict);
                            }
                            else {
                                this.do_relax(this.observe.predict);
                            }
                        }
                        else if (this.observe.predict.rel.y < 70) { // zone 2
                            if (this.observe.predict.rel.x < 100) {
                                if (this.observe.self.hang == 0) {
                                    this.do_hang(this.observe.predict, "low");
                                }
                                else {
                                    this.do_pounce(this.observe.predict, false, "low", false);
                                }
                            }
                            else {
                                this.do_chase(this.observe.predict);
                            }
                        }
                        else { // zone 3
                            if (this.observe.predict.rel.x < 100) {
                                this.do_pounce(this.observe.predict, false, "low", false);
                            }
                            else {
                                this.do_hops(this.observe.predict, false, "low", "low", "low");
                            }
                        }
                        break;
                    default:
                        this.do_hops(this.observe.predict, false, "low", "low", "low");
                        break;
                }
                break;
            case "hang":
                switch (this.difficulty) {
                    case 0: // hang, easy difficulty
                        if (this.observe.player.toy === "mouse" && chance < 0.7) { // mouse is mostly on the floor
                            this.do_aerial(this.observe.player, "low", false);
                        }
                        else if (this.observe.player.abs.y < 20) { // line of sight
                            this.do_aerial(this.observe.player, "low", false);
                        }
                        else {
                            this.do_climb(this.observe.player);
                        }
                        break;
                    case 1: // hang, intermediate difficulty
                        if (this.observe.player.toy === "mouse" && chance < 0.8) { // mouse is mostly on the floor
                            this.do_aerial(this.observe.player, "low", false);
                        }
                        else if (this.observe.player.abs.y < 20) { // line of sight
                            this.do_aerial(this.observe.player, "low", false);
                        }
                        else {
                            this.do_climb(this.observe.player);
                        }
                        break;
                    case 2: // hang, hard difficulty
                        if (this.observe.player.toy === "mouse" && chance < 0.9) { // mouse is mostly on the floor
                            this.do_aerial(this.observe.predict, "min", false);
                        }
                        else if (this.observe.player.abs.y < 20) { // line of sight
                                this.do_aerial(this.observe.predict, "low", false);
                        }
                        else {
                            this.do_climb(this.observe.predict);
                        }
                        break;
                    default:
                        this.do_aerial(this.observe.predict, "low");
                        break;
                }
                break;
            case "climb":
                switch (this.difficulty) {
                    case 0: // climb, easy difficulty
                        this.do_aerial(this.observe.player, "low", true);
                        break;
                    case 1: // climb, intermediate difficulty
                        this.do_aerial(this.observe.predict, "low", true);
                        break;
                    case 2: // climb, hard difficulty
                        this.do_aerial(this.observe.predict, "low", true);
                        break;
                    default:
                        this.do_aerial(this.observe.predict, "low", true);
                        break;
                }
                break;
            default:
                this.do_relax(this.observe.player);
                break;
        }
    }

    // filler behavior for idling/stalling/default
    do_relax(target) {
        if (!this.observe.boundary.bottom.hit &&
            (this.observe.boundary.left.hit || this.observe.boundary.right.hit)) {
            this.enqueue_action(
                "hang",
                null,
                [target, 1000, 0, 0]
            );
        }
        else {
            this.enqueue_action(
                "sit",
                [target],
                [target, 1000, 500, 100]
            );

            this.enqueue_action(
                "idle",
                [target],
                [target, 1000, 500, 100]
            );
        }
    }

    // sit for an extended period of time facing a target
    do_sit(target) {
        this.enqueue_action(
            "sit",
            [target],
            [target, 3000, 2000, 40]
        );
    }

    // run a large distance to target, then walk a short distance
    do_chase(target) {
        this.enqueue_action(
            "run",
            [target],
            [target, 6000, 30],
            [target]
        );

        this.enqueue_action(
            "walk",
            [target],
            [target, 6000, 0, 10, 30],
            [target]
        );
    }

    // optionally crouch (skip) before jumping to target using one of "min" or "low" (flag)
    // solutions for jump velocity, optionally hanging on to walls if collided with (bool),
    // and finally landing back on the ground
    do_pounce(target, skip, flag, bool) {
        if (!skip) {
            this.enqueue_action(
                "crouch",
                [target]
            );
        }

        this.enqueue_action(
            "jump",
            [target, flag],
            [bool]
        );

        this.enqueue_action(
            "land"
        );
    }

    // crouch and wait for a random period of time up to a max of 2.5 seconds,
    // then sit up and jump to target using one of "min" or "low" (flag)
    // solutions for jump velocity, optionally hanging on to walls if collided with (bool),
    // and finally landing back on the ground
    do_trick(target, flag, bool) {
        let delay = Math.random() * 2500;
        this.enqueue_action(
            "crouch",
            [target]
        );

        this.enqueue_action(
            "wait",
            [target],
            [delay],
            [target]
        );

        this.enqueue_action(
            "sit",
            [this.observe.player],
            [this.observe.player, 2000, 1500, 50]
        );

        this.enqueue_action(
            "jump",
            [target, flag],
            [bool]
        );

        this.enqueue_action(
            "land"
        );
    }

    // crouch and wait for a random period of time up to a max of 2.5 seconds,
    // then jump to target using one of "min" or "low" (flag) solutions for jump velocity, 
    // optionally hanging on to walls if collided with (bool),
    // and finally landing back on the ground
    do_suspense(target, flag, bool) {
        let delay = Math.random() * 5000;
        this.enqueue_action(
            "crouch",
            [target]
        );

        this.enqueue_action(
            "wait",
            [target],
            [delay],
            [target]
        );

        this.enqueue_action(
            "jump",
            [target, flag],
            [bool]
        );

        this.enqueue_action(
            "land"
        );
    }

    // run to target and then attack
    do_attack(target) {
        this.enqueue_action(
            "run",
            [target],
            [target, 10000, 15],
            [target]
        );

        this.enqueue_action(
            "attack",
            [target]
        );
    }

    // sneak close to target
    do_sneak(target) {
        this.enqueue_action(
            "sneak",
            [target],
            [target, 6000, 4000, 15, 40],
            [target]
        );
    }

    // run to the wall nearest to target, then crouch and jump to target 
    // using one of "min" or "low"(flag) solutions for jump velocity, 
    // and collide with the wall to hang on
    // * land is queued as a precaution, and will be overwritten with hang
    // by the end condition of jump
    do_hang(target, flag) {
        let wall;
        let x;

        let relative_left = Math.abs(target.pos.x - this.observe.boundary.left.pos.x);
        let relative_right = Math.abs(target.pos.x - this.observe.boundary.right.pos.x);

        if (relative_left < relative_right) {
            wall = this.observe.boundary.left;
            x = this.observe.boundary.left.pos.x + 50;
        }
        else {
            wall = this.observe.boundary.right;
            x = this.observe.boundary.right.pos.x - 50;
        }

        this.enqueue_action(
            "run-to",
            [x],
            [x, 6000, 5]
        );

        this.enqueue_action(
            "crouch",
            [wall]
        );

        this.enqueue_action(
            "jump",
            [wall, flag],
            [true]
        );

        // * incase bounce condition is triggered in jump
        this.enqueue_action(
            "land"
        );
    }

    // run to the wall nearest to target, then crouch and jump to target 
    // using one of "min" or "low"(flag) solutions for jump velocity, 
    // and collide with the wall to bounce off, finally landing back down
    do_bounce(target, flag) {
        let wall;
        let x;

        let relative_left = Math.abs(target.pos.x - this.observe.boundary.left.x);
        let relative_right = Math.abs(target.pos.x - this.observe.boundary.right.x);

        if (relative_left < relative_right) {
            wall = this.observe.boundary.left;
            x = this.observe.boundary.left.pos.x + 50;
        }
        else {
            wall = this.observe.boundary.right;
            x = this.observe.boundary.right.pos.x - 50;
        }

        this.enqueue_action(
            "run-to",
            [x],
            [x, 6000, 5]
        );

        this.enqueue_action(
            "crouch",
            [wall]
        );

        this.enqueue_action(
            "jump",
            [wall, flag],
            [false]
        );

        this.enqueue_action(
            "land"
        );
    }

    // climb towards target
    do_climb(target) {
        this.enqueue_action(
            "climb",
            [target],
            [target, 6000, 10],
            [target]
        );
    }

    // briefly hang to idle, then wall jump towards target 
    // using one of "min" or "low"(flag) solutions for jump velocity, 
    // and finally land back on the ground
    do_aerial(target, flag, bool) {
        if (bool) {
            this.enqueue_action(
                "hang",
                null,
                [target, 500, 0, 0]
            );
        }

        this.enqueue_action(
            "wall-jump",
            [target, flag]
        );

        this.enqueue_action(
            "land"
        );
    }

    // optionally crouch (skip) before the first jump to target, then for each
    // jump use one of "min" or "low"(flags) solutions for jump velocity, 
    // landing back on the ground between each jump
    // * boolean for hanging onto colliding walls is false for each jump
    do_hops(target, skip, flag_0, flag_1, flag_2) {
        this.do_pounce(target, skip, flag_0, false);
        this.do_pounce(target, false, flag_1, false);
        this.do_pounce(target, false, flag_2, false);
    }

    // create and register known actions as schemas 
    // * by dynamically binding parameter lists to an actions functions (execute, condition, update),
    // * we can treat actions as schemas and generate new actions with different targets, conditions, and updates
    register_actions() {
        this.actions.factory.register(
            this,
            "sit",
            // execute: face target and set sprite state,
            // set both velocity and acceleration to zero
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("sit-" + direction.facing);

                this._physics.set_velocity_components(0, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, 
            // or minimum time and maximum distance to target exceeded
            function (target, max_t, min_t, max_d) {
                return this.actions.elapsed >= max_t ||
                    (this.actions.elapsed >= min_t && target.dis >= max_d);
            }
        );

        this.actions.factory.register(
            this,
            "idle",
            // execute: face target and set sprite state,
            // set both velocity and acceleration to zero
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("idle-" + direction.facing);

                this._physics.set_velocity_components(0, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, 
            // or minimum time and maximum distance to target exceeded
            function (target, max_t, min_t, max_d) {
                return this.actions.elapsed >= max_t ||
                    (this.actions.elapsed >= min_t && target.dis >= max_d);
            }
        );

        this.actions.factory.register(
            this,
            "wait",
            // execute: face target and set sprite state,
            // set both velocity and acceleration to zero
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("wait-" + direction.facing);

                this._physics.set_velocity_components(0, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded
            function (max_t) {
                return this.actions.elapsed >= max_t;
            },
            // update: sprite to face target
            function (target) {
                if (target.abs.x >= 5) {
                    let direction = this.direction(target.pos, true);
                    this.switch_state("wait-" + direction.facing);
                }
            }
        );

        this.actions.factory.register(
            this,
            "attack",
            // execute: if target is out of reach vertically, clear all actions, then crouch, jump at target, and land,
            // otherwise face target, set sprite state, and set animation to no-repeat,
            // set both velocity and acceleration to zero
            // * non-repeating animation means that the final frame will not be looped back to the first
            // * triggers audio
            function (target) {
                if (target.abs.y > 30) {
                    this.clear_future_actions();
                    this.change_current_action(
                        "crouch",
                        [target]
                    );

                    this.enqueue_action(
                        "jump",
                        [target, "low"],
                        [true]
                    );

                    this.enqueue_action(
                        "land"
                    );

                    return;
                }

                let direction = this.direction(target.pos, true);
                this.set_state("attack-" + direction.facing);
                this._sprite.set_repeat(false);

                this._physics.set_velocity_components(0, 0);
                this._physics.set_acceleration_components(0, 0);

                this._audio.play("attack");
            },
            // condition: end once final frame of animation is completed
            function () {
                return this._sprite.is_finished();
            }
        );

        this.actions.factory.register(
            this,
            "walk",
            // execute: face target and set sprite state,
            // set walk velocity in the direction of target and acceleration to zero
            // * velocity is modified by difficulty
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("walk-" + direction.facing);

                let velocity_x = direction.sign * (this.speeds.walk + (0.03 * this.difficulty));
                this._physics.set_velocity_components(velocity_x, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, minimum relative x to target reached,
            // or minimum time and maximum relative x to target exceeded
            function (target, max_t, min_t, min_x, max_x) {
                return this.action_elapsed >= max_t || target.abs.x <= min_x ||
                    (this.actions.elapsed >= min_t && target.abs.x >= max_x);
            },
            // update: sprite and velocity direction towards target
            function (target) {
                let direction = this.direction(target.pos, true);
                if (direction.sign != Math.sign(this._physics.velocity.x)) {
                    this.switch_state("walk-" + direction.facing);

                    this._physics.set_velocity_components(-this._physics.velocity.x, 0);
                }
            }
        );

        this.actions.factory.register(
            this,
            "run",
            // execute: face target and set sprite state,
            // set run velocity in the direction of target and acceleration to zero
            // * velocity is modified by difficulty
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("run-" + direction.facing);

                let velocity_x = direction.sign * (this.speeds.run + (0.03 * this.difficulty));
                this._physics.set_velocity_components(velocity_x, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded or minimum relative x to target reached
            function (target, max_t, min_x) {
                return this.actions.elapsed >= max_t || target.abs.x <= min_x;
            },
            // update: sprite and velocity direction towards target
            function (target) {
                let direction = this.direction(target.pos, true);
                if (direction.sign != Math.sign(this._physics.velocity.x)) {
                    this.switch_state("run-" + direction.facing);

                    this._physics.set_velocity_components(-this._physics.velocity.x, 0);
                }
            }
        );

        this.actions.factory.register(
            this,
            "run-to",
            // execute: face target x and set sprite state,
            // set run velocity in the direction of target x and acceleration to zero
            // * velocity is modified by difficulty
            function (x) {
                let sign = Math.sign(x - this._physics.midpoint.x);
                let facing = sign >= 0 ? "right" : "left";
                this.set_state("run-" + facing);

                let velocity_x = sign * (this.speeds.run + (0.03 * this.difficulty));
                this._physics.set_velocity_components(velocity_x, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, 
            // or relative x reached within some small range
            function (x, max_t, range) {
                return this.actions.elapsed >= max_t ||
                    Math.abs(x - this._physics.midpoint.x) < range;
            }
        );

        this.actions.factory.register(
            this,
            "sneak",
            // execute: face target and set sprite state,
            // set sneak velocity in the direction of target and acceleration to zero
            // * velocity is modified by difficulty
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("sneak-" + direction.facing);

                let velocity_x = direction.sign * (this.speeds.sneak + (0.03 * this.difficulty));
                this._physics.set_velocity_components(velocity_x, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, minimum relative x to target reached,
            // or minimum time and maximum relative x to target exceeded
            function (target, max_t, min_t, min_x, max_x) {
                return this.action_elapsed >= max_t || target.abs.x <= min_x ||
                    (this.actions.elapsed >= min_t && target.abs.x >= max_x);
            },
            // update: sprite and velocity direction towards target
            function (target) {
                let direction = this.direction(target.pos, true);
                if (direction.sign != Math.sign(this._physics.velocity.x)) {
                    this.switch_state("sneak-" + direction.facing);

                    this._physics.set_velocity_components(-this._physics.velocity.x, 0);
                }
            }
        );

        this.actions.factory.register(
            this,
            "crouch",
            // execute: face target, set sprite state, and set animation to no-repeat,
            // set both velocity and acceleration to zero
            // * non-repeating animation means that the final frame will not be looped back to the first
            function (target) {
                let direction = this.direction(target.pos, true);
                this.set_state("crouch-" + direction.facing);
                this._sprite.set_repeat(false);

                this._physics.set_velocity_components(0, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end once final frame of animation is completed
            function () {
                return this._sprite.is_finished();
            }
        );

        this.actions.factory.register(
            this,
            "jump",
            // execute: adjust target position further away if too close, 
            // then face target, set sprite state, and set animation to no-repeat,
            // calculate the jump velocity to target using either "low" or "min" solutions (flag), 
            // and divide total flight time equally across animated frames durations
            // * non-repeating animation means that the final frame will not be looped back to the first
            // * if such a velocity does not exist then run to target
            // * velocity is modified by difficulty
            // * triggers audio
            function (target, flag) {
                let target_position = target.pos.copy();
                if (target.abs.x < 20 && target.abs.y < 20) {
                    let signs = new Vector(Math.sign(this.observe.player.rel.x), 1);
                    target_position = signs.multiply(20).add(target_position);
                }

                let direction = this.direction(target_position, true);
                this.set_state("jump-" + direction.facing);
                this._sprite.set_repeat(false);

                if (flag != "low" && flag != "min") {
                    flag = "low";
                }

                let speed_max = this.speeds.jump + (0.002 * this.difficulty);
                let velocity = Projectile[flag + "_launch_velocity"](
                    this._physics.midpoint,
                    target_position,
                    speed_max,
                    this.speeds.min,
                    this._physics.gravity
                );

                if (velocity === null) {
                    this.clear_future_actions();
                    this.change_current_action(
                        "run",
                        [target],
                        [target, 6000, 30],
                        [target]
                    );
                    return;
                }

                let flight_time = Projectile.time_of_flight(
                    this._physics.midpoint.y,
                    0,
                    velocity.y,
                    this._physics.gravity.y
                );

                this._physics.jump(velocity);

                let frame_count = this._sprite.get_frame_count();
                let frame_duration = flight_time / frame_count;

                this._sprite.set_frame_duration(frame_duration);

                this._audio.play("jump_1");
            },
            // condition: end if collision with floor occurs,
            // or collision with either left or right walls occur and hang is picked,
            // in which case case queued actions are cleared and hang queued to stick to the wall, 
            // if the wall collision is too close to the ceiling or floor, or the bool parameter forces it,
            // a bounce occurs instead with the wall and the end condition is not met
            // * triggers audio
            function (bool) {
                if (!this.observe.boundary.left.hit && !this.observe.boundary.right.hit &&
                    !this.observe.boundary.bottom.hit) {
                    return false;
                }
                else if (this.observe.boundary.bottom.hit) {
                    return true;
                }
                else if (this.observe.boundary.left.hit || this.observe.boundary.right.hit) {
                    if (!bool || this.observe.boundary.top.abs.y < 20 || this.observe.boundary.bottom.abs.y < 20) {
                        let velocity = Vector.reflect_x(this._physics.velocity);
                        this._physics.set_velocity(velocity);

                        let facing = velocity.x < 0 ? "left" : "right";
                        this.switch_state("jump-" + facing);

                        this._audio.play("land");
                        return false;
                    }
                    else {
                        let wall = this.observe.boundary.left.hit ?
                            this.observe.boundary.left : this.observe.boundary.right;

                        this._physics.set_position_components(wall.pos.x, this._physics.hitbox.points().b.y);

                        this.clear_future_actions();
                        this.enqueue_action("hang", [wall], [6000, 1000, 150]);

                        return true;
                    }
                }
            },
            // update: stop ascending if ceiling is hit
            function () {
                if (this.observe.boundary.top.hit) {
                    this._physics.set_velocity_components(null, 0);
                }
            }
        );

        this.actions.factory.register(
            this,
            "wall-jump",
            // execute: adjust target position further away if too close to the colliding wall, 
            // then face target, set sprite state, and set animation to no-repeat,
            // calculate the jump velocity to target using either "low" or "min" solutions (flag), 
            // and divide total flight time equally across animated frames durations
            // * non-repeating animation means that the final frame will not be looped back to the first
            // * if such a velocity does not exist then do a small jump off the wall
            // * velocity is modified by difficulty
            // * triggers audio
            function (target, flag) {
                let target_position = target.pos.copy();
                if (target.abs.x < 10) {
                    let signs = Vector.subtract(this._physics._boundary.midpoint(), this._physics.midpoint).signs();
                    target_position = signs.multiply(20).add(this._physics.midpoint);
                }

                let direction = this.direction(target_position, true);
                this.set_state("jump-" + direction.facing);
                this._sprite.set_repeat(false);

                if (flag != "low" && flag != "min") {
                    flag = "low";
                }

                let speed_max = this.speeds.jump + (0.002 * this.difficulty);
                let velocity = Projectile[flag + "_launch_velocity"](
                    this._physics.midpoint,
                    target_position,
                    speed_max,
                    this.speeds.min,
                    this._physics.gravity
                );

                if (velocity === null) {
                    let signs = Vector.subtract(this._physics._boundary.midpoint(), this._physics.position).signs();
                    target_position = signs.multiply(20).add(this._physics.position);
                    velocity = Projectile[flag + "_launch_velocity"](
                        this._physics.midpoint,
                        target_position,
                        speed_max,
                        this.speeds.min,
                        this._physics.gravity
                    );
                }

                let flight_time = Projectile.time_of_flight(
                    this._physics.midpoint.y,
                    0,
                    velocity.y,
                    this._physics.gravity.y
                );

                this._physics.jump(velocity);

                let frame_count = this._sprite.get_frame_count();
                let frame_duration = flight_time / frame_count;

                this._sprite.set_frame_duration(frame_duration);

                this._audio.play("jump_1");
            },
            // condition: end if collision with floor occurs,
            // if collision with either left or right walls occur then bounce off and continue jump
            // * triggers audio
            function () {
                if (!this.observe.boundary.left.hit && !this.observe.boundary.right.hit &&
                    !this.observe.boundary.bottom.hit) {
                    return false;
                }
                else if (this.observe.boundary.bottom.hit) {
                    return true;
                }
                else if (this.observe.boundary.left.hit || this.observe.boundary.right.hit) {
                    let velocity = Vector.reflect_x(this._physics.velocity);
                    this._physics.set_velocity(velocity);

                    let facing = velocity.x < 0 ? "left" : "right";
                    this.switch_state("jump-" + facing);

                    this._audio.play("land");
                    return false;
                }
            },
            // update: stop ascending if ceiling is hit
            function () {
                if (this.observe.boundary.top.hit) {
                    this._physics.set_velocity_components(null, 0);
                }
            }
        );

        this.actions.factory.register(
            this,
            "land",
            // execute: face forward, set sprite state, and set animation to no-repeat,
            // trigger physics landing logic to set velocity to zero and remove gravity influence
            // * non-repeating animation means that the final frame will not be looped back to the first
            // * triggers audio
            function () {
                let facing = this._physics.velocity.x < 0 ? "left" : "right";
                this.set_state("land-" + facing);
                this._sprite.set_repeat(false);

                this._physics.land();

                this._audio.play("land");
            },
            // condition: end once final frame of animation is completed
            function () {
                return this._sprite.is_finished();
            }
        );

        this.actions.factory.register(
            this,
            "hang",
            // execute: set sprite state respective to colliding (hanging) wall,
            // set x to the walls x, and set both velocity and acceleration to zero
            function (wall = null) {
                wall ??= this.observe.boundary.left.hit ?
                    this.observe.boundary.left : this.observe.boundary.right;
                this.set_state("hang-" + wall.id);

                this._physics.set_position_components(wall.pos.x);
                this._physics.set_velocity_components(0, 0);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, 
            // or minimum time and minimum distance to target reached
            function (target, max_t, min_t, min_d) {
                return this.actions.elapsed >= max_t ||
                    (this.actions.elapsed >= min_t && target.dis <= min_d);
            }
        );

        this.actions.factory.register(
            this,
            "climb",
            // execute: set sprite state respective to colliding (hanging) wall,
            // set climb velocity in the direction of target and acceleration to zero
            // * velocity is modified by difficulty
            function (target, wall = null) {
                wall ??= this.observe.boundary.left.hit ?
                    this.observe.boundary.left : this.observe.boundary.right;
                let sign = Math.sign(target.rel.y);
                let direction = sign < 0 ? "down" : "up";
                this.set_state("climb" + "-" + wall.id + "-" + direction);

                let velocity_y = sign * (this.speeds.climb + (0.015 * this.difficulty));
                this._physics.set_velocity_components(0, velocity_y);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, minimum relative y to target reached,
            // or ceiling or floor collided with 
            function (target, max_t, min_y) {
                return this.actions.elapsed >= max_t || target.abs.y < min_y ||
                    (this.observe.boundary.top.hit || this.observe.boundary.bottom.hit);
            },
            // update: sprite and velocity direction to face target
            function (target, wall = null) {
                wall ??= this.observe.boundary.left.hit ?
                    this.observe.boundary.left : this.observe.boundary.right;
                let sign = Math.sign(target.rel.y);
                if (sign != Math.sign(this._physics.velocity.y)) {
                    let direction = sign < 0 ? "down" : "up";
                    this.switch_state("climb" + "-" + wall.id + "-" + direction);

                    this._physics.set_velocity_components(0, -this._physics.velocity.y);
                }
            }
        );

        this.actions.factory.register(
            this,
            "climb-to",
            // execute: set sprite state respective to colliding (hanging) wall,
            // set climb velocity in the direction of y and acceleration to zero
            // * velocity is modified by difficulty
            function (y, wall = null) {
                wall ??= this.observe.boundary.left.hit ?
                    this.observe.boundary.left : this.observe.boundary.right;
                let sign = Math.sign(y - this._physics.midpoint.y);
                let direction = sign < 0 ? "down" : "up";
                this.set_state("climb" + "-" + wall.id + "-" + direction);

                let velocity_y = sign * (this.speeds.climb + (0.015 * this.difficulty));
                this._physics.set_velocity_components(0, velocity_y);
                this._physics.set_acceleration_components(0, 0);
            },
            // condition: end if maximum time exceeded, 
            // or relative y reached within some small range
            function (y, max_t, range) {
                return this.actions.elapsed >= max_t ||
                    Math.abs(y - this._physics.position.y) < range;
            }
        );
    }

    // reset cat 
    // * used after gameover when starting a new round
    reset(initial) {
        this.set_state(initial.state);

        this.difficulty = 0;

        this.actions.queue = [];
        this.actions.history = [initial.action];
        this.elapsed = 0;

        let position = Vector.from(initial.physics.position);
        let velocity = Vector.from(initial.physics.velocity);
        let acceleration = Vector.from(initial.physics.acceleration);

        this._physics.set_position(position);
        this._physics.set_velocity(velocity);
        this._physics.set_acceleration(acceleration);
    }
}

export { Cat }