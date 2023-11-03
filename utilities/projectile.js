"use strict";

//  ===================================================[ IMPORTS ]

import { Vector } from "./index.js"

// |===================================================|
// |                   PROJECTILE                      |
// |===================================================|
// | Utility static class for projectile motion.       |
// |                                                   |
// | p_0: launch position                              |
// | p_t: target position                              |
// | s:   speed                                        |
// | a:   acceleration                                 |
// | t:   time                                         |
// | v_0: launch velocity                              |
// |===================================================|

// all projectile functions are static
function Projectile() { }

// test if a solution exists 
Projectile.has_solution = function (p_0, p_t, s, a) {
    let d = Vector.subtract(p_t, p_0);
    let b = d.dot(a) + s * s;

    let dscrm = b * b - a.dot(a) * d.dot(d);
    if (dscrm < 0) {
        return false; // no solution exists
    }
    return true;
}

// solve for launch velocity using the quickest time to target
Projectile.min_launch_velocity = function (p_0, p_t, s_max, s_min, a) {
    let d = Vector.subtract(p_t, p_0);
    let b = d.dot(a) + s_max * s_max;

    let dscrm = b * b - a.dot(a) * d.dot(d);
    if (dscrm < 0) {
        return null; // no solution exists
    }

    let t = Math.sqrt(2 * (b - Math.sqrt(dscrm)) / a.dot(a));
    let v_d = Vector.divide(d, t);
    let v_a = Vector.multiply(a, t).divide(2);

    let v = Vector.subtract(v_d, v_a);

    // if velocity exceeds max, readjust accordingly
    if (v.length() > s_max) {
        let theta = Math.atan2(v.y, v.x);
        v.x = s_max * Math.cos(theta);
        v.y = s_max * Math.sin(theta);
    }
    // if velocity is less than min, readjust accordingly
    else if (v.length() < s_min) {
        let theta = Math.atan2(v.y, v.x);
        v.x = s_min * Math.cos(theta);
        v.y = s_min * Math.sin(theta);
    }

    return v;
}

// solve for launch velocity using the lowest energy
Projectile.low_launch_velocity = function (p_0, p_t, s_max, s_min, a) {
    let d = Vector.subtract(p_t, p_0);
    let b = d.dot(a) + s_max * s_max;
    let dscrm = b * b - a.dot(a) * d.dot(d);

    if (dscrm < 0) {
        return null; // no solution exists
    }

    let t = Math.sqrt(Math.sqrt(4 * d.dot(d) / a.dot(a)));
    let v_d = Vector.divide(d, t);
    let v_a = Vector.multiply(a, t).divide(2);

    let v = Vector.subtract(v_d, v_a);

    // if velocity exceeds max, readjust accordingly
    if (v.length() > s_max) {
        let theta = Math.atan2(v.y, v.x);
        v.x = s_max * Math.cos(theta);
        v.y = s_max * Math.sin(theta);
    }
    // if velocity is less than min, readjust accordingly
    else if (v.length() < s_min) {
        let theta = Math.atan2(v.y, v.x);
        v.x = s_min * Math.cos(theta);
        v.y = s_min * Math.sin(theta);
    }

    return v;
}

// get any point along a projectiles trajectory
Projectile.get_point = function (p_0, v_0, a, t) {
    let d_0 = Vector.multiply(v_0, t);
    let d_1 = Vector.multiply(a, t * t).divide(2);
    return Vector.add(p_0, d_0).add(d_1);
}

// get the time of flight of a projectile from any launch height to any target height
Projectile.time_of_flight = function (py_0, py_t, vy_0, g) {
    let dy_0 = -(vy_0 / g);
    let dy_t = -Math.sqrt(vy_0 * vy_0 - 2 * g * (py_0 - py_t)) / g;
    return dy_0 + dy_t;
}

export { Projectile }