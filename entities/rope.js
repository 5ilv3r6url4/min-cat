"use strict";

//  ===================================================[ IMPORTS ]

import { Vector } from "../utilities/index.js"

// |===================================================|
// |                     POINT                         |
// |===================================================|
// | Data class for a point, consists of a position,   |
// | previous position, original position for fast     |
// | reset, and an anchor flag if it should not be     |
// | included in integrations.                         |
// |===================================================|

class Point {
    position;
    position_previous;
    position_original;

    anchor;

    // a point is created with a position and optional anchor flag
    constructor(position, anchor = null) {
        anchor ??= false;

        this.position = position.copy();
        this.position_previous = position.copy();
        this.position_original = position.copy();
        this.anchor = anchor;
    }

    // reset this point to its starting position
    reset() {
        this.position.set(this.position_original.x, this.position_original.y);
        this.position_previous.set(this.position_original.x, this.position_original.y);
    }
}

// |===================================================|
// |                    SEGMENT                        |
// |===================================================|
// | Data class for a segment, consists of two points  |
// | and a length.                                     |
// |===================================================|

class Segment {
    point_a;
    point_b;

    length;

    // a segment consists of two points and a fixed length
    constructor(point_a, point_b, length) {
        this.point_a = point_a;
        this.point_b = point_b;
        this.length = length;
    }
}

// |===================================================|
// |                      ROPE                         |
// |===================================================|
// | Rope physics for Player "pouf" state, uses verlet |
// | integration to simulate a rope with a number of   |
// | segments. Handles boundary collisions, and        | 
// | responds to entity collisions.                    |
// |===================================================|

class Rope {
    // physical components of the rope
    points;
    segments;

    // number of constraint iterations
    iterations;

    // additional forces to act on rope
    instance;
    gravity;

    // game world boundary
    _boundary;

    // a rope consists of a series of connected fixed length segments
    // sharing points at their ends, with one point acting as an achor
    // * config is found in the config file and sets initial values
    constructor(config, boundary) {
        this.points = [];
        this.segments = [];
        this.iterations = config.iterations;

        this.trajectory = new Vector();
        this.instance = new Vector();
        this.gravity = Vector.from(config.gravity);

        this._boundary = boundary;

        // create the anchor
        let anchor_position = Vector.from(config.anchor);
        let anchor_point = new Point(anchor_position, true);
        this.points.push(anchor_point);

        // create the rope
        let offset = new Vector(0, config.segment_length);
        for (let i = 1; i < config.number_segments; ++i) {
            let point_a = this.points[i - 1];

            let position_b = point_a.position.copy().subtract(offset);
            let point_b = new Point(position_b);
            this.points.push(point_b);

            let segment = new Segment(point_a, point_b, config.segment_length);
            this.segments.push(segment);
        }
    }

    // use verlet integration to move the rope, resolve boundary 
    // collisions, and reset any instance force that may be acting on the rope
    // * instance forces occur during collisions with other entities, 
    // * or when the player uses their ability  
    integrate(position, dt) {
        this.simulate(position, dt);
        this.constraints();
        this.instance.set(0, 0);
    }

    // simulate the rope as forces act on it
    // * set the anchor to the position
    simulate(position, dt) {
        this.points.forEach((point) => {
            if (!point.anchor) {
                let position_previous = point.position.copy();
                let position_new = point.position.copy();

                // apply forces
                let delta_position = Vector.subtract(point.position, point.position_previous);
                let delta_instance = Vector.multiply(this.instance, dt);
                let delta_gravity = Vector.multiply(this.gravity, dt * dt);

                position_new.add(delta_position);
                position_new.add(delta_instance);
                position_new.add(delta_gravity);

                // resolve potential boundary collisions
                // * a small friction force is applied to floor collisions
                if (position_new.x < this._boundary.position.x + 1) {
                    position_previous.x = position_new.x;
                    position_new.x = this._boundary.position.x + 1;
                }
                else if (position_new.x > this._boundary.position.x + this._boundary.dimensions.x - 1) {
                    position_previous.x = position_new.x;
                    position_new.x = this._boundary.position.x + this._boundary.dimensions.x - 1;
                }
                if (position_new.y < this._boundary.position.y - this._boundary.dimensions.y + 1) {
                    position_previous.y = position_new.y;
                    position_new.y = this._boundary.position.y - this._boundary.dimensions.y + 1;
                    position_new.x += delta_position.x * -1 * 0.5;
                }
                else if (position_new.y > this._boundary.position.y - 1) {
                    position_previous.y = position_new.y;
                    position_new.y = this._boundary.position.y - 1;
                }

                // save the points previous position and set its new position
                point.position_previous = position_previous;
                point.position = position_new;
            }
            else {
                // save the anchor points previous position and set its new position
                point.position_previous = point.position.copy();
                point.position = position.copy();
            }
        });
    }

    // run constraints on rope segments a number of times 
    // * this ensures that segment length violations after simulating
    // * are sufficiently resolved
    constraints() {
        for (let i = 0; i < this.iterations; ++i) {
            this.segments.forEach((segment) => {
                let point_a = segment.point_a;
                let point_b = segment.point_b;

                let center = Vector.add(point_a.position, point_b.position).divide(2);
                let direction = Vector.subtract(point_a.position, point_b.position).unit();
                let offset = direction.multiply(segment.length / 2);

                if (!point_a.anchor) {
                    point_a.position = Vector.add(center, offset);
                }
                if (!point_b.anchor) {
                    point_b.position = Vector.subtract(center, offset);
                }
            });
        }
    }

    // add an instance force to the rope
    impulse(v) {
        this.instance.add(v);
    }

    // get any point on the rope, 
    // or the last point if no index is provided
    get_point(i = null) {
        if (i === null) {
            return this.points[this.points.length - 1];
        }
        else {
            return this.points[i];
        }
    }

    // reset the rope
    reset() {
        for (let i = 0; i < this.points.length; ++i) {
            this.points[i].reset();
        }
        this.instance.set(0, 0);
    }
}

export { Rope }