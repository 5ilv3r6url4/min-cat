"use strict";

//  ===================================================[ IMPORTS ]

import { Vector } from "../utilities/index.js"

// |===================================================|
// |                    INPUT                          |
// |===================================================|
// | Track user mouse position and events bound to     |
// | a provided context.                               |
// |===================================================|

class Input {
    mouse_position;
    mouse_down;
    mouse_up;

    // track mouse move, mouse down, and mouse up events
    // bind events to the provided context
    constructor(canvas) {
        this.mouse_position = new Vector(-999, -999);
        this.mouse_down = false;
        this.mouse_up   = false;

        canvas.onmousemove = this.on_mouse_move.bind(this);
        canvas.onmousedown = this.on_mouse_down.bind(this);
        canvas.onmouseup   = this.on_mouse_up.bind(this);
    }

    // track mouse move events and save offset position
    // * handles resize events
    on_mouse_move(event) {
        this.mouse_position.set(event.offsetX, event.offsetY);
    }

    // save left mouse down
    on_mouse_down(event) {
        if (event.button == 0) {
            this.mouse_down = true;
        }
    }

    // save left mouse up
    on_mouse_up(event) {
        if (event.button == 0) {
            this.mouse_up = true;
            this.mouse_down = false;
        }
    }

    // reset mouse state
    reset_mouse() {
        this.mouse_down = false;
        this.mouse_up = false;
    }
}

export { Input }