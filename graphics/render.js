"use strict";

//  ===================================================[ IMPORTS ]

import { bresenham, Vector } from "../utilities/index.js"

// |===================================================|
// |                    RENDER                         |
// |===================================================|
// | Responsible for all direct canvas drawing calls.  |
// |===================================================|

class Render {
    // dom
    _canvas;
    _context;

    // canvas properties
    width;
    height;
    scale;

    // creates canvas context, sets dimensions and flags, 
    // and saves the background image to be used
    // * config is found in the config file and sets initial values
    constructor(config) {
        this.width   = config.DIMENSIONS.width;
        this.height  = config.DIMENSIONS.height;
        this.scale   = config.DIMENSIONS.scale;

        this._canvas  = document.getElementById(config.CANVAS);
        this._context = this._canvas.getContext(config.CONTEXT);

        this._context.canvas.width          = config.DIMENSIONS.width;
        this._context.canvas.height         = config.DIMENSIONS.height;
        this._context.imageSmoothingEnabled = config.SMOOTHING;
    }

    // clear the canvas at the start of each render loop
    draw_clear() {
        this._context.clearRect(0, 0, this.width, this.height);
        this._context.setTransform(1, 0, 0, 1, 0, 0);
    }

    // add fade to canvas
    // * only effects the things already drawn
    draw_fade() {
        this._context.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this._context.fillRect(0, 0, this.width, this.height);
    }

    // base background
    // * background is animated for certain screens
    draw_background(background) {
        let texture = background.get_texture();
        this._context.drawImage(
            background.image,
            texture.position.x,
            texture.position.y,
            texture.dimensions.x,
            texture.dimensions.y,
            0,
            0,
            this.width,
            this.height
        );
    }

    // index into the provided fontsheet using the dictionary
    // to draw text at the provided position
    draw_text(fontsheet, dictionary, text, position) {
        let canvas_position = this.convert_world_coordinates(position);

        // skip spaces as they don't need rendering
        for (let i = 0; i < text.length; ++i) {
            if (text[i] == " ") {
                continue;
            }

            let texture = dictionary[text[i]].texture;
            let off_x = i * texture.w;

            this._context.drawImage(
                fontsheet,
                texture.u,
                texture.v,
                texture.w,
                texture.h,
                canvas_position.x + off_x,
                canvas_position.y,
                texture.w,
                texture.h
            );
        }
    }

    // using an iconsheet and texture coordinates
    // draw an icon at the provided position
    draw_icon(iconsheet, texture, position) {
        let canvas_position = this.convert_world_coordinates(position);
        this._context.drawImage(
            iconsheet,
            texture.u,
            texture.v,
            texture.w,
            texture.h,
            canvas_position.x,
            canvas_position.y,
            texture.w,
            texture.h
        );
    }

    // draw a 1 pixel wide rope by using a series of segment points
    // and the bresenham line algorithm to individually color in pixels
    draw_rope(rope) {
        this._context.fillStyle = "black";
        for (let i = 0; i < rope.segments.length; ++i) {
            let position_point_a = this.convert_world_coordinates(rope.segments[i].point_a.position);
            let position_point_b = this.convert_world_coordinates(rope.segments[i].point_b.position);
            let position_points = bresenham(position_point_a, position_point_b);

            this._context.fillRect(position_point_a.x, position_point_a.y, 1, 1);
            this._context.fillRect(position_point_b.x, position_point_b.y, 1, 1);
            for (let j = 0; j < position_points.length; ++j) {
                this._context.fillRect(position_points[j].x, position_points[j].y, 1, 1);
            }

        }
    }

    // draw a given entity
    // * the entity sprite contains all rendering data
    // * correct frame data is retrieved from the sprite
    draw_entity(entity) {
        let frame_data = entity._sprite.get_frame_data();
        let canvas_position = this.convert_world_coordinates(entity._physics.hitbox.position);

        this._context.drawImage(
            entity._sprite.spritesheet,
            frame_data.texture.position.x,
            frame_data.texture.position.y,
            frame_data.texture.dimensions.x,
            frame_data.texture.dimensions.y,
            canvas_position.x,
            canvas_position.y,
            frame_data.texture.dimensions.x,
            frame_data.texture.dimensions.y
        );
    }

    // convert coordinates between world and canvas
    // * a new vector is returned
    convert_world_coordinates(v) {
        return new Vector(Math.round(v.x), Math.round(this.height - v.y));
    }

    // convert coordinates from window (dom relative) to canvas
    // * a new vector is returned
    convert_window_coordinates(v) {
        let rect = this._canvas.getBoundingClientRect();
        var scale = this._canvas.width / parseFloat(rect.width);
        return Vector.round(Vector.multiply(v, scale));
    }
}

export { Render }