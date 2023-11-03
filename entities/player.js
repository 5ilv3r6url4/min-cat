"use strict";

//  ===================================================[ IMPORTS ]

import { Entity, Rope } from "./index.js"
import { Timer, Vector } from "../utilities/index.js"

// |===================================================|
// |                      TOY                          |
// |===================================================|
// | Functional class for toy behaviors and abilities. |
// |===================================================|

class Toy {
    ability;
    condition;
    position;
    integrate;
    collide;

    // a toy consists of a series of functions bound to the player
    // * ability is the click-hold-release event, triggers audio
    // * condition is the end criteria of the ability
    // * position is the way this toy processes positional data
    // * integrate is the way this toy updates its physics state over dt
    // * collide is the way this toy processes collision events
    constructor(player, ability, condition, position, integrate, collide) {
        this.ability   = ability.bind(player);
        this.condition = condition.bind(player);
        this.position  = position.bind(player);
        this.integrate = integrate.bind(player);
        this.collide   = collide.bind(player);
    }
}

// |===================================================|
// |                    PLAYER                         |
// |===================================================|
// | Subclass of Entity, responsible for the player.   |
// | Additionally includes health, hit logic, ability  | 
// | logic, and a rope object for the "pouf" state.    |
// |===================================================|

class Player extends Entity {
    // player type selection
    // player type options (function groups)
    toy;
    toys;

    // player health and max health
    health;

    // active ability flag
    ability;

    // timers for hit and ability events
    timer_hit;
    timer_ability;

    // current power, max power, and max power levels
    power;

    // rope for pouf state
    // * has its own physics system
    _rope;

    // a player requires health, timers for damage and abilities, 
    // power data and logic for abilites, a rope for the "pouf" toy,
    // and a collection of toys to play as
    // * config is found in the config file and sets initial values
    // * asset must include spritesheet and atlas
    // * audio is the global audio system shared across all entities and objects
    // * boundary is a reference to the game world boundary
    constructor(config, asset, audio, boundary) {
        super(config.INITIAL, asset, audio, boundary);

        this.health = {
            current: config.HEALTH,
            max: config.HEALTH
        };

        // ability flag used for all toys
        this.ability = false;

        // * ability timer is used only for the laser
        this.timer_hit = new Timer(config.HIT_DURATION);
        this.timer_ability = new Timer(config.ABILITY_DURATION);

        // power is used for abilities and special cursor renderings
        this.power = {
            current: 0,
            max: config.POWER_MAX,
            max_levels: config.POWER_MAX_LEVELS
        };

        // rope has its own physics system and is a component of "pouf"
        this._rope = new Rope(config.ROPE, boundary);

        // toys available to the player
        // * each has its own unique ability and manner of 
        // * interacting with the game world
        this.toy = config.INITIAL.state;
        this.toys = {};

        // laser toy
        // * basic, no physics system
        this.toys["laser"] = new Toy(
            this,
            function () { // ability
                this.timer_ability.start();
                this.ability = true;

                this._audio.play("laser");
                return;
            },
            function (dt) { // condition
                if (this.timer_ability.decrement(dt)) {
                    this.ability = false;
                    return;
                }
            },
            function (v) { // position
                this._physics.set_position(v);
                return;
            },
            function () { // integrate
                return;
            },
            function () { // collide
                if (!this.ability) {
                    this.damage();
                }
                return;
            }
        );

        // mouse toy
        // * intermediate, basic physics system
        // * additionally can face either left or right
        this.toys["mouse"] = new Toy(
            this,
            function () { // ability
                let impulse = new Vector(0, this.power.current);
                this._physics.jump(impulse);

                this.power.current = 0;
                this.ability = true;

                this._audio.play("jump_2");
                return
            },
            function () { // condition
                if (this._physics.position.y <= 1) {
                    this._physics.land();
                    this.ability = false;

                    this._audio.play("land");
                }
                return;
            },
            function (v) { // position
                let position = new Vector(v.x, 1);
                if (this.ability) {
                    position.set(null, this._physics.position.y);
                }
                this._physics.set_position(position);

                // mouse can face left or right
                if (this._physics.trajectory.x != 0) {
                    let facing = Math.sign(this._physics.trajectory.x) < 0 ? "left" : "right";
                    let is_hit = this.timer_hit.active ? "-hit" : "";
                    let state = "mouse-" + facing + is_hit;
                    this.switch_state(state);
                }
                return;
            },
            function (dt) { // integrate
                this._physics.integrate(dt);
                return;
            },
            function () { // collide
                this.damage();
                return;
            }
        );

        // pouf toy
        // * advanced, more complex physics system
        // * has its own physics system
        this.toys["pouf"] = new Toy(
            this,
            function () { // ability
                let tug = new Vector(0, this.power.current);
                this._rope.impulse(tug);

                this.ability = true;

                this._audio.play("pouf");
                return;
            },
            function (dt) { // condition
                this.power.current = Math.max(0, this.power.current - (dt / 5000));
                if (this.power.current == 0) {
                    this.ability = false;
                }
                return;
            },
            function (v) { // position
                this._physics.set_position(v);
                return;
            },
            function (dt) { // integrate
                this._rope.integrate(this._physics.position, dt);
                this._physics.set_position(this._rope.get_point().position);
                return;
            },
            function (other) { // collide
                let bounce = this._physics.resolve_collision(other._physics).multiply(0.1);
                this._rope.impulse(bounce);
                this.damage();
                return;
            }
        );
    }

    // sets the current toy, and updates the sprite state
    // * there is an additional proxy texture for mouse to
    // * handle state without direction
    set_toy(toy) {
        this.set_state(toy);
        this.toy = toy;

        // cosmetic, makes the mouse drop down to starting position
        if (toy === "mouse") {
            let impulse = new Vector();
            this._physics.jump(impulse);
            this.ability = true;
        }
    }

    // process the players mouse position in world space
    // * each toy processes this data differently
    // * laser simply sets the position
    // * mouse runs along the ground
    // * pouf sets the anchor position to be later integrated from
    process_position(v) {
        if (!(v instanceof Vector)) return;
        this.toys[this.toy].position(v);
    }

    // process the players collision with other entities
    // * each toy processes this event differently
    // * laser receives damage if not using its ability
    // * mouse receives damage
    // * pouf impulses away and receives damage
    process_collision(other) {
        if (this._physics.collides(other._physics)) {
            this.toys[this.toy].collide(other);
            return true;
        }
        return false;
    }

    // advance the physics system
    // * each toy does this differently
    // * with laser having none, mouse having a basic system,
    // * and pouf using verlet integration
    integrate(dt) {
        this.toys[this.toy].integrate(dt);
    }

    // trigger the players chosen toy ability
    // laser will "turn off" for a brief time becoming invulnerable
    // mouse jumps
    // pouf tugs
    do_ability() {
        if (!this.ability) {
            this.toys[this.toy].ability();
        }
    }

    // decrement the hit timer if active (active check is done in timer)
    // if the timer completes then remove the hit tag from the sprite
    // checks for the end condition of players chosen toy ability if active
    // * lasers ability ends after a brief period of time
    // * mouse ability ends after landing back on the ground
    // * pouf ability ends when power level returns to 0
    logic(dt) {
        if (this.timer_hit.decrement(dt)) {
            this.set_state(this._sprite.state.slice(0, -4));
        }
        if (this.ability) {
            this.toys[this.toy].condition(dt);
        }
    }

    // increment the power level, converting from ms to s, and limiting it to a fixed max
    // * laser is the only toy that does not use power
    increment_power(dt) {
        if (!this.ability) {
            this.power.current = Math.min(this.power.current + (dt / 1000), this.power.max);
        }
    }

    // set power to manual value
    set_power(val) {
        this.power.current = val;
    }

    // gets the power level, converted into a range from 0 to max levels
    // * used to provide rendered cue to the player cursor for mouse and pouf
    get_power_level() {
        return Math.floor((this.power.current * this.power.max_levels) / this.power.max);
    }

    // damage the player, removing 1 hp, and adding the hit tag to the sprite
    // * does not trigger if the player is in brief post-hit invulnerability
    // * triggers audio if health lost
    damage() {
        if (!this.timer_hit.active) {
            this.health.current -= 1;
            if (this.health.current > 0) {
                this.set_state(this._sprite.state + "-hit");
                this.timer_hit.start();
                this._audio.play("hit");
            }
        }
    }

    // returns true if player has lost all health
    defeated() {
        if (this.health.current <= 0) {
            this._audio.play("defeat");
            return true;
        }
    }

    // reset the player physics and logistic states
    reset() {
        this.health.current = this.health.max;

        this.ability = false;

        this.timer_ability.reset();
        this.timer_hit.reset();

        this.power.current = 0;

        this._physics.set_velocity_components(0, 0);
        this._physics.set_acceleration_components(0, 0);

        this._rope.reset();
    }
}

export { Player }