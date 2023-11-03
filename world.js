"use strict";

//  ===================================================[ IMPORTS ]

import { CONFIG }              from "./config.js"
import { Background, GUI,
         Loader, Render }      from "./graphics/index.js"
import { Stereo }              from "./audio/index.js"
import { Cat, Player }         from "./entities/index.js"
import { Input }               from "./inputs/index.js"
import { Rectangle, Vector }   from "./utilities/index.js"

// |===================================================|
// |                    WORLD                          |
// |===================================================|
// | Starting point of the game, responsible for       |
// | calling all subsystems and creating entities.     |
// |===================================================|

class World {
    // graphics
    _render;

    // background
    _background;

    // global audio controller
    // * shared across all audio producing game objects
    _audio;

    // interface and gui data (e.g. score)
    _gui;

    // user input (mouse)
    _input;

    // entities
    _player;
    _cat;

    // game world boundary
    boundary;

    // physics
    elapsed;
    accumulator;
    timestep;

    // screen (game) state
    screen;

    // creates an instance of the game world and all its components and data,
    // binds the game loop step to this world instance
    // * a resource loader is passed in to grab and pass assets to components that require them
    constructor(loader) {
        // start screen
        // * making this an object allows us to pass screen state by reference to gui
        this.screen = { state: "init" };

        // boundary in world space
        this.boundary = new Rectangle(new Vector(0, CONFIG.GRAPHICS.DIMENSIONS.height),
            new Vector(CONFIG.GRAPHICS.DIMENSIONS.width, CONFIG.GRAPHICS.DIMENSIONS.height));

        // physics timesteps are fixed
        this.elapsed     = 0;
        this.accumulator = 0;
        this.timestep    = 1000 / CONFIG.GRAPHICS.FPS;

        // all assets
        // * an asset is comprised of an image and an atlas to index into the image
        let background_asset = loader.get(CONFIG.BACKGROUND.RESOURCE_ID);
        let gui_assets   = loader.get(CONFIG.GUI.RESOURCE_IDS);
        let cat_asset    = loader.get(CONFIG.CAT.RESOURCE_ID);
        let player_asset = loader.get(CONFIG.PLAYER.RESOURCE_ID);

        // background
        this._background = new Background(this.screen.state, background_asset);

        // graphics
        this._render = new Render(CONFIG.GRAPHICS);

        // audio
        // * initialization delayed until initial user interaction
        this._audio = new Stereo();

        // interface
        this._gui    = new GUI(CONFIG.GUI, gui_assets, this._render, this._audio, this.boundary, this.screen);

        // mouse state
        this._input  = new Input(this._render._canvas);

        // entities
        this._player = new Player(CONFIG.PLAYER, player_asset, this._audio, this.boundary);
        this._cat    = new Cat(CONFIG.CAT, cat_asset, this._player, this._audio, this.boundary);

        // game loop
        this.step    = this.step.bind(this);
    }

    // main game loop
    // * ms passed in by requestAnimationFrame; running time since first request
    step(ms) {
        // calculate ms since previous animation frame
        let dt = Math.min(ms - this.elapsed, 30);
        this.elapsed = ms;

        // process mouse input
        this.process_input(dt);

        // when the game is in active screen (playing)
        if (this.screen.state === "active") {
            // increment score and difficulty
            let score = this._gui.increment_score(dt);
            this._cat.set_difficulty(Math.floor(score / 60000));

            // trigger game logic and ai behavior
            this.logic(dt);

            // integrate entity physics
            this.physics(dt);
        }

        // animate and draw
        // * animate and draw calls differentiate screen states 
        this.animate(dt);
        this.draw();

        // repeat game loop
        requestAnimationFrame(this.step);
    }

    // process user input into cursor & player position and screen (game) state
    // * game is exclusively controlled by mouse
    process_input(dt) {
        // mouse position from screen to world
        let canvas_position = this._render.convert_window_coordinates(this._input.mouse_position);
        let world_position = this._render.convert_world_coordinates(canvas_position);

        // process positions for cursor and player
        // * cursor is the limiting position for the player
        this._gui.process_position(world_position);
        this._player.process_position(this._gui.cursor.position);

        // should a button be highlighted?
        this._gui.check_button_highlights();

        // screen (game) state
        switch (this.screen.state) {
            // init screen for preloads
            case "init":
                if (this._input.mouse_up) {
                    // initialize game audio contexts
                    // * user interaction is required prior to initializing
                    this._audio.initialize(CONFIG.AUDIO);

                    // set start screen
                    this.change_screen_state("start");
                }
                break;
            // start screen
            case "start":
                if (this._input.mouse_up) {
                    // has a button been clicked?
                    let button = this._gui.check_button_clicks();
                    if (button !== null) {
                        if (button.value.toy !== undefined) {
                            // set player state selection
                            // * cursors are specific to player state
                            this._player.set_toy(button.value.toy);
                            this._gui.set_active_cursor(button.value.cursor);

                            // start playing the game
                            this.change_screen_state("active");
                        }
                    }
                }
                break;
            // game over screen
            case "game_over":
                if (this._input.mouse_up) {
                    // has the restart button been clicked?
                    let button = this._gui.check_button_clicks();
                    if (button !== null) {
                        // go back to the start screen 
                        if (button.value === "restart") {
                            this.change_screen_state("start");
                        }
                    }
                }
                break;
            // pause screen
            case "pause":
                if (this._input.mouse_up) {
                    // has the play button been clicked?
                    let button = this._gui.check_button_clicks();
                    if (button !== null) {
                        // unpause the game
                        if (button.value === "play") {
                            this.change_screen_state("active");
                        }
                    }
                }
                break;
            // active screen
            default:
                // mouse down to increase ability power
                if (this._input.mouse_down) {
                    this._player.increment_power(dt);
                }
                // mouse up to execute ability at current power 
                // and pause the game if button clicked
                else if (this._input.mouse_up) {
                    // has the pause button been clicked?
                    let button = this._gui.check_button_clicks();
                    if (button !== null) {
                        // pause the game
                        if (button.value === "pause") {
                            this.change_screen_state("pause");
                        }
                        // reset power level as ability is not intended
                        // * for pouf, power level slowly decrements
                        if (!this._player.ability) {
                            this._player.set_power(0);
                        }
                    }
                    else {
                        // execute ability at current power
                        this._player.do_ability(this._player.power);
                    }
                }
        }

        // reset mouse state only when mouse up
        // * otherwise we cannot track mouse down duration
        if (this._input.mouse_up) {
            this._input.reset_mouse();
        }
    }

    // trigger entity logic systems
    logic(dt) {
        // check player health
        if (this._player.defeated()) {
            // end the current round
            this.change_screen_state("game_over");
            this._audio.music.stop();
            this._audio.play("defeat");
            return;
        }

        // entity logic
        // * player ability and hit logistics
        this._player.logic(dt);
        // * cat ai
        this._cat.logic(dt);
    }

    // trigger physics systems
    // * integrate motion and resolve collisions
    physics(dt) {
        // timesteps are fixed
        this.accumulator += dt;
        // catch up to integrations when required
        // * excess time left over is discarded
        while (this.accumulator >= this.timestep) {
            this._player.integrate(this.timestep);
            this._cat.integrate(this.timestep);
            this.accumulator -= this.timestep;
        }

        // process colisions between entities
        // * if a collision occurs, update the gui health 
        if (this._player.process_collision(this._cat)) {
            this._gui.set_health(this._player.health.current);
        }

        // resolve boundary collisions
        this._player.resolve_boundary();
        this._cat.resolve_boundary();
    }

    // animate entities
    // * animations conditioned on screen (game) state
    animate(dt) {
        // init screen for preloads
        switch (this.screen.state) {
            case "init":
                this._gui.animate(dt);
                break;
            // start screen
            case "start":
                this._cat.animate(dt);
                this._gui.animate(dt);
                break;
            // game over screen
            case "game_over":
                this._gui.animate(dt);
                break;
            // pause screen
            case "pause":
                this._gui.animate(dt);
                break;
            // active screen
            // * set power level modifier in gui cursor
            default:
                this._cat.animate(dt);
                this._player.animate(dt);
                this._background.animate(dt);
                this._gui.set_cursor_mod(this._player.get_power_level());
        }
    }

    // draw background, gui, and entities
    // * draw calls conditioned on screen (game) state
    draw() {
        // base clear and render
        this._render.draw_clear();

        // draw background
        this._render.draw_background(this._background);

        // subsequent draw calls conditioned on screen (game) state
        switch (this.screen.state) {
            // init screen for preloads
            case "init":
                this._gui.draw_screen_init();
                this._gui.draw_cursor();
                break;
            // start screen
            case "start":
                this._render.draw_entity(this._cat);
                this._gui.draw_screen_start();
                this._gui.draw_cursor();
                break;
            // game over screen
            case "game_over":
                this._render.draw_entity(this._cat);
                this._gui.draw_screen_gameover();
                this._gui.draw_cursor();
                break;
            // pause screen
            case "pause":
                this._gui.draw_screen_active();
                this._render.draw_entity(this._cat);
                this._gui.draw_screen_pause();
                this._gui.draw_cursor();
                break;
            // active screen
            // * each player state has unique draw call logic
            default:
                this._gui.draw_screen_active();
                this._render.draw_entity(this._cat);
                this._gui.draw_cursor();
                switch (this._player.toy) {
                    case "laser":
                        if (!this._player.ability) {
                            this._render.draw_entity(this._player);
                        }
                        break;
                    case "mouse":
                        this._render.draw_entity(this._player);
                        break;
                    case "pouf":
                        this._render.draw_rope(this._player._rope);
                        this._render.draw_entity(this._player);
                        break;
                    default:
                        break;
                }
        }
    }

    // handle all logic related to changing screen (game) state
    // * gui components change in response to screen (game) state
    // * this includes resetting the game world on restart and audio
    change_screen_state(state) {
        this.screen.state = state;
        this._background.set_screen(state);
        this._gui.update();

        // reset required
        if (state === "start") {
            // reset game world
            this._input.reset_mouse();
            this._player.reset();
            this._cat.reset();

            // reset music
            // * stop defeat sound bite
            this._audio.stop("defeat");

            // * music is paused to play defeat sound bite, resume if not muted
            if (!this._audio.mute && !this._audio.music.playing()) {
                this._audio.music.play();
            }
        }
    }
}

//  ===================================================[ START ]

window.onload = function () {
    // instantiate loader and add preconfigured resources
    let loader = new Loader();
    CONFIG.RESOURCES.forEach((resource) => { loader.add(resource) });

    // load all resources as assets and then start game loop
    loader.load()
        .then(() => {
            let world = new World(loader);
            window.requestAnimationFrame(world.step);
        })
        .catch(error => {
            console.log(error);
            return false;
        });
}