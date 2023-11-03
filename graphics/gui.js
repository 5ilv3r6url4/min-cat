"use strict";

//  ===================================================[ IMPORTS ]

import { Rectangle, Timer, Vector } from "../utilities/index.js";

// |===================================================|
// |                    CURSOR                         |
// |===================================================|
// | Cursor object is the players gui representation.  |
// | Has its own asset, rendering logic, and collides  |
// | with other gui elements (e.g. buttons) and the    |
// | game world boundary.                              |
// |===================================================|

class Cursor {
    // rendering asset and id
    iconsheet;
    atlas;
    icon;

    // rendering data and logic
    // * because we regularly switch between pointer and active cursors,
    // * we store a reference to each type to quickly switch as needed
    // * active cursors display player power levels (mod) when using abilities
    icon_active;
    icon_pointer;
    mod;
    mod_max;

    // basic physics
    _boundary;
    position;
    hitbox;

    // set rendering data, logic, and default basic physics
    // * rendering logic includes cursor icons and player power levels
    // * asset must include image and atlas
    constructor(asset, boundary, position, pointer = null) {
        // rendering data
        pointer ??= "pointer";
        this.iconsheet = asset.image;
        this.atlas = asset.atlas;
        this.icon = pointer;

        // rendering logic
        this.icon_active = pointer;
        this.icon_pointer = pointer;
        this.mod = 0;
        this.mod_max = 0;

        // basic physics; position and collisions with boundary
        // and gui elements
        this._boundary = boundary;
        this.position = position;
        this.hitbox = new Rectangle();

        this.update_hitbox();
    }

    // returns the texture for the current cursor
    // * the pointer is used in pause, start, and game over screen (game) states
    get_texture() {
        if (this.icon === "pointer") {
            return this.atlas[this.icon].texture;
        }
        else {
            return this.atlas[this.icon + "-" + this.mod].texture;
        }
    }

    // returns the frame data for the current cursor
    // * the pointer is used in pause, start, and game over screen (game) states
    get_frame_data() {
        if (this.icon === "pointer") {
            return this.atlas[this.icon];
        }
        else {
            return this.atlas[this.icon + "-" + this.mod];
        }
    }

    // sets the active icon and calculates the number of power (mod) 
    // levels stored as textures
    set_active_icon(icon) {
        this.icon_active = icon;

        this.mod = 0;
        this.mod_max = -1;
        Object.keys(this.atlas).forEach((texture) => {
            if (texture.includes(icon)) {
                this.mod_max++;
            }
        });
    }

    // sets the pointer icon
    set_pointer_icon(icon) {
        this.icon_pointer = icon;
    }

    // switches between pointer and active icons
    // updates the cursor hitbox
    // * may pass in a boolean to force setting one or the other
    switch(bool = null) {
        if (bool !== null && bool) {
            this.icon = this.icon_active;
        }
        else if (bool !== null && !bool) {
            this.icon = this.icon_pointer;
        }
        else if (this.icon === this.icon_pointer) {
            this.icon = this.icon_active;
        }
        else {
            this.icon = this.icon_pointer;
        }
        this.update_hitbox();
    }

    // sets the mod value
    set_mod(val) {
        if (isNaN(val) || val < 0) {
            return;
        }
        else {
            this.mod = Math.min(val, this.mod_max);
        }
    }

    // keep the cursor within the game worlds boundary
    // * hide the pointer cursor when out of bounds
    resolve_boundary() {
        let translation = this.hitbox.difference(this._boundary);
        if (this.icon === "pointer" && translation.y != 0) {
            translation = new Vector(-999, -999);
        }
        this.move(translation);
    }

    // move the cursor and hitbox by the same delta
    move(delta) {
        this.position.add(delta);
        this.hitbox.translate(delta);
    }

    // process input positions, detecting and resolving boundary collisions
    process_position(v) {
        let delta = Vector.subtract(v, this.position);
        this.move(delta);
        if (!this._boundary.contains(this.hitbox)) {
            this.resolve_boundary();
        }
    }

    // update the hitbox whenever the icon is changed
    update_hitbox() {
        let frame_data = this.get_frame_data();

        let hitbox_position = new Vector(
            this.position.x - frame_data.anchor.x,
            this.position.y + frame_data.anchor.y
        );
        let hitbox_dimensions = new Vector(frame_data.texture.w, frame_data.texture.h);

        this.hitbox.set(hitbox_position, hitbox_dimensions);
    }
}

// |===================================================|
// |                    BUTTON                         |
// |===================================================|
// | Represents a single button; texture, state,       |
// | value, click sound, and hitbox.                   |
// |                                                   |
// | * The disabled flag is toggled between screen     |
// | (game) states, and the highlight flag is toggled  |
// | by mouseovers.                                    |
// |===================================================|

class Button {
    // rendering asset and flags
    // * each button has three textures; regular, highlighted, and disabled
    // * all three textures have the same dimensions
    textures;
    highlight;
    disabled;

    // returned value when clicked
    value;

    // sound to play when clicked
    sound;

    // basic physics
    hitbox;

    // a button requires three textures; regular, highlight, and disabled,
    // as well as a position, and value and sound for when clicked
    constructor(textures, position, value, sound) {
        this.textures = textures;
        this.highlight = false;
        this.disabled = false;

        this.value = value;
        this.sound = sound;

        let hitbox_position = new Vector(position.x, position.y);
        let hitbox_dimensions = new Vector(textures.regular.w, textures.regular.h);
        this.hitbox = new Rectangle(hitbox_position, hitbox_dimensions);
    }

    // check if a position is contained by this buttons hitbox
    // * mute toggle button is a special case that should always be checked
    check(position) {
        if (this.disabled && this.value !== "mute") {
            return false;
        }
        else {
            return this.hitbox.contains(position);
        }
    }

    // gets the texture of this button
    // * based on the current state of it
    get_texture() {
        switch (true) {
            case this.highlight:
                return this.textures.highlight;
                break;
            case this.disabled:
                return this.textures.disabled;
                break;
            default:
                return this.textures.regular;
                break;
        }
    }

    // setters
    set_highlight(bool) {
        this.highlight = bool;
    }

    set_disabled(bool) {
        this.disabled = bool;
    }
}

// |===================================================|
// |                    BUTTONS                        |
// |===================================================|
// | Container class for buttons, consists of button   |
// | assets and button groups, allows disabling of     |
// | entire groups or specific buttons by group and    |
// | value.                                            |
// |===================================================|

class Buttons {
    // rendering asset
    iconsheet;

    // button groups
    groups;

    // mapping between button groups and game screens
    mappings;

    // this container class consists of an iconsheet, 
    // and dynamic button groups created later
    // * this class only requires the image portion of an asset,
    // * as buttons include their own textures
    constructor(iconsheet) {
        this.iconsheet = iconsheet;
        this.groups = {};
        this.mappings = {};
    }

    // adds a button
    // * if the group does not exist, create it
    add(button, label) {
        if (this.groups[label] === undefined) {
            this.groups[label] = [];
        }
        this.groups[label].push(button);
    }

    // adds a button group (by label) screen mapping
    // * if the screen mapping does not exist, create it
    map(label, screen) {
        if (this.mappings[screen] === undefined) {
            this.mappings[screen] = [];
        }
        this.mappings[screen].push(label);
    }

    // get buttons by their group
    get_group(label) {
        let buttons = this.groups[label];
        if (buttons === undefined) {
            return [];
        }
        else
            return buttons;
    }

    // get buttons by their mapped screen
    get_screen(screen) {
        let buttons = [];
        let groups = this.mappings[screen];
        if (groups !== undefined) {
            for (let i = 0; i < groups.length; ++i) {
                let label = groups[i];
                buttons.push(...this.get_group(label));
            }
        }
        return buttons;
    }

    // sets the highlight flags during mouse over of buttons
    // * first narrows down buttons to check by screen
    check_highlights(screen, position) {
        let buttons = this.get_screen(screen);
        for (let i = 0; i < buttons.length; ++i) {
            if (buttons[i].check(position)) {
                buttons[i].set_highlight(true);
            }
            else {
                buttons[i].set_highlight(false);
            }
        }
    }

    // returns a clicked button or null
    // * first narrows down buttons to check by screen
    check_clicks(screen, position) {
        let buttons = this.get_screen(screen);
        for (let i = 0; i < buttons.length; ++i) {
            if (buttons[i].check(position)) {
                buttons[i].set_highlight(false);
                return buttons[i];
            }
        }
        // no buttons clicked
        return null;
    }

    // disables or enables a specific button by group label and value
    // * if null is omitted, the entire group is disabled
    disable(label, bool, value = null) {
        let buttons = this.get_group(label);
        for (let i = 0; i < buttons.length; ++i) {
            let button = buttons[i];
            if (value === null) {
                button.set_disabled(bool);
            }
            else if (button.value === value) {
                button.set_disabled(bool);
                return;
            }
        }
    }
}

// |===================================================|
// |                   MESSAGE                         |
// |===================================================|
// | Data class for a message, consists of the text to |
// | display and the position to display at.           |
// |===================================================|

class Message {
    // rendering content
    text;
    position;

    // a message consists of text and position
    constructor(text, position) {
        this.text = text;
        this.position = position;
    }
}

// |===================================================|
// |                    MESSAGES                       |
// |===================================================|
// | Container class for messages, consists of a font, |
// | dictionary to index into the font, and a timer    |
// | for flashing messages.                            |
// |                                                   |
// | * All messages share the same flash duraton, and  |
// | are differentiated by screen (game) state.
// |===================================================|

class Messages {
    // rendering asset
    fontsheet;
    dictionary;

    // animation
    flash;
    timer;

    // this class container must include an asset, flash duration,
    // and dynamic messages created as objects on this class later
    // * asset must include spritesheet and atlas
    constructor(fontsheet, dictionary, duration) {
        this.fontsheet = fontsheet;
        this.dictionary = dictionary;

        this.flash = true;
        this.timer = new Timer(duration);
        this.timer.start();
    }

    // advance the flash animation
    // * loop the timer 
    animate(dt) {
        if (this.timer.decrement(dt)) {
            this.flash = !this.flash;
            this.timer.start();
        }
    }
}

// |===================================================|
// |                      HEART                        |
// |===================================================|
// | Data class for a heart, includes a texture that   |
// | determines if this heart is full or empty, and    |
// | a position to render it at.                       |
// |===================================================|

class Heart {
    // rendering content
    texture;
    position;

    // a heart consists of texture and position
    constructor(texture, position) {
        this.texture = texture;
        this.position = position;
    }
}

// |===================================================|
// |                     HEALTH                        |
// |===================================================|
// | Container class for hearts, consists of an asset, |
// | fixed list of textures, a list of hearts, and the |
// | players current health. Responsible for           |
// | responding to changes in players health.          |
// |                                                   |
// | * Empty and full hearts are set via heart         |
// | textures as a function of player health.          |
// |===================================================|

class Health {
    // rendering asset and data
    iconsheet;
    textures;
    hearts;

    // texture logic
    hp;

    // this container class consists of an image and fixed textures,
    // as well as positions for the hearts
    // * positions determine the total number of hearts displayed
    // * hearts are by default created with the full texture
    constructor(iconsheet, textures, positions) {
        this.iconsheet = iconsheet;
        this.textures = textures;

        this.hearts = [];
        for (let i = 0; i < positions.length; ++i) {
            let heart = new Heart(textures.full, positions[i]);
            this.hearts.push(heart);
        }

        this.hp = positions.length;
    }

    // respond to a change in the players health
    update(hp) {
        this.hp = hp;
        for (let i = 0; i < this.hearts.length; ++i) {
            this.hearts[i].texture = i < this.hp ? this.textures.full : this.textures.empty;
        }
    }

    // reset all hearts to full
    reset() {
        this.update(this.hearts.length);
    }
}

// |===================================================|
// |                     SCORE                         |
// |===================================================|
// | Data class for score, consists of text to render, |
// | position to render at, and the number of points   |
// | the player has scored.                            |
// |===================================================|

class Score {
    // rendering content
    text;
    position;
    points;

    // a score consists of text to render, position to render at,
    // and the number of points scored
    constructor(text, position) {
        this.text = text;
        this.position = position;
        this.points = 0;
    }
}

// |===================================================|
// |                     SCORES                        |
// |===================================================|
// | Container class for scores, consists of an asset, |
// | a current running score, a record highscore, and  |
// | the max allowable points that can be scored. This |
// | class is responsible for incrementing the current |
// | score, saving the record highscore, and           |
// | generating the score text to render.              |
// |===================================================|

class Scores {
    // rendering assets 
    fontsheet;
    dictionary;

    // rendering content
    current;
    record;

    // logistical limits
    max;
    max_length;

    // this class requires an asset, two score objects, and 
    // the maximum allowable score a player can achieve
    // * max is converted from seconds to ms
    constructor(fontsheet, dictionary, current, record, max) {
        this.fontsheet = fontsheet;
        this.dictionary = dictionary;

        this.current = current;
        this.record = record;

        this.max = max * 1000;
        this.max_length = max.toString().length;
    }

    // save the new record highscore
    save_record() {
        if (this.record.points < this.current.points) {
            this.record.points = this.current.points;
        }
    }

    // increment the current score by a number of points and return it
    // * limits the score to the max allowable
    increment_current(points) {
        this.current.points += points;
        if (this.current.points > this.max) {
            this.current.points = this.max;
        }
        return this.current.points;
    }

    // generates the text for the provided score type; current or record
    // * converts score from ms to seconds
    generate_text(type) {
        if (type !== "current" && type !== "record") {
            return "";
        }
        else {
            let string = Math.round(this[type].points / 1000).toString();
            while (string.length < this.max_length) {
                string = "0" + string;
            }
            return this[type].text + string;
        }
    }

    // reset the current score
    reset() {
        this.current.points = 0;
    }
}

// |===================================================|
// |                      GUI                          |
// |===================================================|
// | Responsible for the whole of the game interface.  |
// | Stores and manages components of the interface;   |
// | player cursor, scores, buttons, health, and       |
// | messages. Also responsible for calling its own    |
// | render functions, in this way by using a          |
// | reference to the screen (game) state, multiple    |
// | draw calls can be structured into cohesive        |
// | functions. Triggers its own button audio cues.    |
// |===================================================|

class GUI {
    // the gui is responsible for calling its render functions
    _render;

    // global audio system
    _audio;

    // reference to screen (game) state from world
    _screen;

    // player cursor
    cursor;

    // on-screen gui components
    // * each acts as an access point for its container of individual components
    // * this way assets and logic can be shared across similar components
    scores;
    buttons;
    health;
    messages;

    // the gui is comprised of a number of assets, components, 
    // and a reference to render and screen
    // * config is found in the config file and sets majority of component values
    constructor(config, assets, render, audio, boundary, screen) {
        this._render = render;
        this._audio = audio;
        this._screen = screen;

        // player cursor
        let cursor_position = Vector.from(config.CURSOR.position);
        this.cursor = new Cursor(assets.CURSORS, boundary, cursor_position);

        // buttons components
        // * buttons are separated into groups by type
        // * if a group does not exist it is created when adding a button of its type
        this.buttons = new Buttons(assets.ICONS.image);
        Object.keys(config.BUTTONS).forEach((type) => {
            Object.keys(config.BUTTONS[type]).forEach((instance) => {
                let textures = {
                    regular: assets.ICONS.atlas[instance].texture,
                    highlight: assets.ICONS.atlas[instance + "-highlight"].texture,
                    disabled: assets.ICONS.atlas[instance + "-disabled"].texture,
                };
                let position = Vector.from(config.BUTTONS[type][instance].position);
                let button = new Button(
                    textures,
                    position,
                    config.BUTTONS[type][instance].value,
                    config.BUTTONS[type][instance].sound
                );
                this.buttons.add(button, type);
            });
        });

        // set button group to screen mappings
        this.buttons.map("toys", "start");
        this.buttons.map("controls", "start");
        this.buttons.map("controls", "pause");
        this.buttons.map("controls", "active");
        this.buttons.map("over", "game_over");

        // * mute toggle should start disabled
        this.buttons.disable("controls", true, "mute");

        // messages components
        // * messages are added dynamically as objects and differentiated by screen
        this.messages = new Messages(assets.FONT.image, assets.FONT.atlas, config.MESSAGE_FLASH)
        Object.keys(config.MESSAGES).forEach((screen) => {
            let position = Vector.from(config.MESSAGES[screen].position);
            let message = new Message(config.MESSAGES[screen].text, position);
            this.messages[screen] = message;
        });

        // health components
        // * hearts respond to player health by changing their texture
        let heart_textures = {
            full: assets.ICONS.atlas["heart-full"].texture,
            empty: assets.ICONS.atlas["heart-empty"].texture
        }

        let heart_positions = [];
        Object.keys(config.HEALTH).forEach((instance) => {
            let position = Vector.from(config.HEALTH[instance].position);
            heart_positions.push(position);
        });

        this.health = new Health(
            assets.ICONS.image,
            heart_textures,
            heart_positions
        );

        // score components
        // * the two scores present are current and record (highscore)
        let score_current_position = Vector.from(config.SCORES.current.position);
        let score_record_position = Vector.from(config.SCORES.record.position);

        let score_current = new Score(config.SCORES.current.text, score_current_position);
        let score_record = new Score(config.SCORES.record.text, score_record_position);

        this.scores = new Scores(
            assets.FONT.image,
            assets.FONT.atlas,
            score_current,
            score_record,
            config.MAX_SCORE
        );
    }

    // sets the highlight flags during mouse over of buttons
    check_button_highlights() {
        this.buttons.check_highlights(this._screen.state, this.cursor.position);
    }

    // returns clicked button or null, 
    // if mute button clicked changes global audio state
    // * if button clicked plays its sound
    check_button_clicks() {
        let button = this.buttons.check_clicks(this._screen.state, this.cursor.position);
        if (button !== null) {
            if (button.value === "mute") {
                let mute = this._audio.toggle_mute();
                button.set_disabled(mute);
            }
            this._audio.play(button.sound);
        }
        return button;
    }

    // process position
    process_position(v) {
        if (!(v instanceof Vector)) return;
        this.cursor.process_position(v);
    }

    // set cursor active icon
    set_active_cursor(icon) {
        this.cursor.set_active_icon(icon);
    }

    // set cursor mod
    set_cursor_mod(val) {
        this.cursor.set_mod(val);
    }

    // update health
    set_health(hp) {
        this.health.update(hp);
    }

    // increment and return current score
    increment_score(points) {
        return this.scores.increment_current(points);
    }

    // respond to changes in screen (game) state
    // * since a reference to the screen is stored, we always have the updated value
    update() {
        switch (this._screen.state) {
            case "start":
                this.scores.reset();
                this.health.reset();
                this.buttons.disable("controls", true, "play");
                this.buttons.disable("controls", true, "pause");
                this.cursor.switch(false);
                break;
            case "game_over":
                this.scores.save_record();
                this.buttons.disable("controls", true, "play");
                this.buttons.disable("controls", true, "pause");
                this.cursor.switch(false);
                break;
            case "pause":
                this.buttons.disable("controls", false, "play");
                this.buttons.disable("controls", true, "pause");
                this.cursor.switch();
                break;
            default: // active
                this.buttons.disable("controls", true, "play");
                this.buttons.disable("controls", false, "pause");
                this.cursor.switch(true);
                break;
        }
    }

    // advance components with animations
    animate(dt) {
        this.messages.animate(dt);
    }

    // cursor specific render call
    draw_cursor() {
        this._render.draw_icon(
            this.cursor.iconsheet,
            this.cursor.get_texture(),
            this.cursor.hitbox.position
        );
    }

    // buttons specific render call
    draw_buttons() {
        let buttons = this.buttons.get_screen(this._screen.state);
        for (let i = 0; i < buttons.length; ++i) {
            let button = buttons[i];
            this._render.draw_icon(
                this.buttons.iconsheet,
                button.get_texture(),
                button.hitbox.position
            );
        }
    }

    // message specific render call
    draw_message() {
        let message = this.messages[this._screen.state];
        if (this.messages.flash) {
            this._render.draw_text(
                this.messages.fontsheet,
                this.messages.dictionary,
                message.text,
                message.position
            );
        }
    }

    // hearts specific render calls
    draw_health() {
        this.health.hearts.forEach((heart) => {
            this._render.draw_icon(
                this.health.iconsheet,
                heart.texture,
                heart.position);
        });
    }

    // score specific render call
    draw_score(type) {
        if (type !== "current" && type !== "record") {
            return;
        }

        let score_text = this.scores.generate_text(type);
        let score_position = this.scores[type].position;
        this._render.draw_text(
            this.scores.fontsheet,
            this.scores.dictionary,
            score_text,
            score_position
        );
    }

    // draw screen
    draw_screen_init() {
        this.draw_message();
    }

    // start screen draw calls
    draw_screen_start() {
        this.draw_message();
        this.draw_buttons();
    }

    // game over screen draw calls
    draw_screen_gameover() {
        this._render.draw_fade();
        this.draw_health();
        this.draw_message();
        this.draw_buttons();
        this.draw_score("current");
        this.draw_score("record");
    }

    // pause screen draw calls
    draw_screen_pause() {
        this._render.draw_fade();
        this.draw_buttons();
        this.draw_message();
    }

    // active screen draw calls
    draw_screen_active() {
        this.draw_buttons();
        this.draw_health();
        this.draw_score("current");
    }
}

export { GUI }