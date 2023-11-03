"use strict";

//  ===================================================[ IMPORTS ]

import { Rectangle, Timer, Vector } from "../utilities/index.js";

// |===================================================|
// |                   BACKGROUND                      |
// |===================================================|
// | Data class for background capable of animating.   |
// |===================================================|

class Background {
    // asset
    image;
    atlas;

    // image
    screen;

    // animation
    frame;
    timer;

    // sets assets, state, and animation related default data 
    // * asset must include image and atlas
    constructor(screen, asset) {
        this.image = asset.image;
        this.atlas = asset.atlas;

        this.screen = screen;
        this.frame = 0;
        this.timer = new Timer();

        // start the animation
        this.timer.start(asset.atlas[screen][0].duration);
    }

    // advance the animation using the timer
    animate(dt) {
        if (this.timer.decrement(dt)) {
            let frames = this.atlas[this.screen];
            let num_frames = frames.length;
            let next_frame = (this.frame + 1) % num_frames;
            this.frame = next_frame;

            let duration = frames[next_frame].duration;
            this.timer.start(duration);
        }
    }

    // get frame data of current action and frame
    get_texture() {
        let frame_data = this.atlas[this.screen][this.frame];
        let texture = frame_data.texture;

        return new Rectangle(new Vector(texture.u, texture.v), new Vector(texture.w, texture.h));
    }

    // setters
    // * changing screen resets animation data
    set_screen(screen) {
        this.screen = screen;
        this.frame = 0;

        this.timer.start(this.atlas[screen][0].duration);
    }
}

export { Background }