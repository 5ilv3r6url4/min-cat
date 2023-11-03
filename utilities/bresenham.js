"use strict";

//  ===================================================[ IMPORTS ]

import { Vector } from "./index.js"

// |===================================================|
// |                   BRESENHEIM                      |
// |===================================================|
// | Utility function for the Bresenheim line          |
// | algorithm; determines the points of a raster to   |
// | form a close approximation to a straight line     |
// | between two points.                               |
// |===================================================|

function bresenham(point_a, point_b) {
    // slope and decision variable
    const delta = Vector.subtract(point_b, point_a).abs();
    let difference = delta.x - delta.y;

    // determine which directions to move in
    const step_horizontal = (point_a.x < point_b.x) ? new Vector(1, 0) : new Vector(-1, 0);
    const step_vertical = (point_a.y < point_b.y) ? new Vector(0, 1) : new Vector(0, -1);

    // starting point
    const point = point_a.copy(); 
    const points = []

    while (true) {
        // determine which direction to move in
        const difference_doubled = 2 * difference;

        // move horizontally
        if (difference_doubled > -delta.y) {
            difference -= delta.y;
            point.add(step_horizontal);
        }
        // move vertically
        if (difference_doubled < delta.x) {
            difference += delta.x;
            point.add(step_vertical);
        }

        // reached end point b
        if ((point.x == point_b.x) && (point.y == point_b.y)) {
            break
        }

        // add point to eventual output
        points.push(point.copy());
    }
    return points
}

export { bresenham }