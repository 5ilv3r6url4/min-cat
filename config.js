"use strict";

// |===================================================|
// |                     CONFIG                        |
// |===================================================|
// | Static game settings and initial entity states.   |
// |===================================================|

const CONFIG = {
    GRAPHICS: {
        CANVAS: "game",
        CONTEXT: "2d",
        FPS: 60,
        SMOOTHING: false,
        DIMENSIONS: { width: 368, height: 100, scale: 4 },
    },
    BACKGROUND: {
        RESOURCE_ID: "BACKGROUND"
    },
    GUI: {
        RESOURCE_IDS: ["ICONS", "FONT", "CURSORS"],
        CURSOR: { icon: "pointer", position: { x: -999, y: -999 } },
        HEALTH: {
            heart_1: { position: { x: 329, y: 97 } },
            heart_2: { position: { x: 342, y: 97 } },
            heart_3: { position: { x: 355, y: 97 } }
        },
        BUTTONS: {
            toys: {
                laser: { position: { x: 157, y: 35 }, sound: "button_a", value: { toy: "laser", cursor: "spot"      } },
                mouse: { position: { x: 177, y: 35 }, sound: "button_a", value: { toy: "mouse", cursor: "crosshair" } },
                pouf:  { position: { x: 202, y: 36 }, sound: "button_a", value: { toy: "pouf",  cursor: "hand"      } }
            },
            controls: {
                pause: { position: { x: 3,  y: 97 }, sound: "button_c", value: "pause" },
                play:  { position: { x: 15, y: 97 }, sound: "button_c", value: "play"  },
                sound: { position: { x: 26, y: 97 }, sound: "button_b", value: "mute" }
            },
            over: {
                restart: { position: { x: 190, y: 55 }, sound: "button_b", value: "restart" }
            }
        },
        MESSAGE_FLASH: 500,
        MESSAGES: {
            init:      { position: { x: 128, y: 55 }, text: "CLICK TO PLAY!" },
            start:     { position: { x: 136, y: 55 }, text: "SELECT A TOY"   },
            pause:     { position: { x: 160, y: 55 }, text: "PAUSED"         },
            game_over: { position: { x: 98,  y: 55 }, text: "GAME OVER!"     }
        },
        MAX_SCORE: 999999,
        SCORES: {
            current: { text: "SCORE:",  position: { x: 136, y: 98 } },
            record:  { text: "RECORD:", position: { x: 132, y: 36 } }
        }
    },
    AUDIO: {
        MUSIC: {
            theme_1: { aac: "./assets/theme_1.aac", mp3: "./assets/theme_1.mp3", volume: 0.3 },
            theme_2: { aac: "./assets/theme_2.aac", mp3: "./assets/theme_2.mp3", volume: 0.3 }
        },
        SOUNDS: {
            button_a: { aac: "./assets/button_a.aac", mp3: "./assets/button_a.mp3", volume: 0.3  },
            button_b: { aac: "./assets/button_b.aac", mp3: "./assets/button_b.mp3", volume: 0.3  },
            button_c: { aac: "./assets/button_c.aac", mp3: "./assets/button_c.mp3", volume: 0.3  },
            jump_1:   { aac: "./assets/jump_1.aac",   mp3: "./assets/jump_1.aac",   volume: 0.15 },
            jump_2:   { aac: "./assets/jump_2.aac",   mp3: "./assets/jump_2.aac",   volume: 0.3  },
            land:     { aac: "./assets/land.aac",     mp3: "./assets/land.mp3",     volume: 0.3  },
            hit:      { aac: "./assets/hit.aac",      mp3: "./assets/hit.mp3",      volume: 0.4  },
            attack:   { aac: "./assets/attack.aac",   mp3: "./assets/attack.mp3",   volume: 0.35 },
            laser:    { aac: "./assets/laser.aac",    mp3: "./assets/laser.mp3",    volume: 0.3  },
            pouf:     { aac: "./assets/pouf.aac",     mp3: "./assets/pouf.mp3",     volume: 0.6  },
            defeat:   { aac: "./assets/defeat.aac",   mp3: "./assets/defeat.mp3",   volume: 0.3  }
        }
    },
    PLAYER: {
        RESOURCE_ID: "PLAYER",
        HEALTH: 3,
        HIT_DURATION: 1500,
        ABILITY_DURATION: 700,
        POWER_MAX: 0.3,
        POWER_MAX_LEVELS: 6,
        ROPE: {
            number_segments: 20,
            segment_length: 1,
            iterations: 500,
            anchor:  { x: 206.5, y: 40  },
            gravity: { x: 0, y: -0.001 }
        },
        INITIAL: {
            state: "laser",
            physics: {
                position:     { x: -999, y: -999 },
                velocity:     { x: 0, y: 0       },
                acceleration: { x: 0, y: 0       },
                gravity:      { x: 0, y: -0.0015 }
            }
        }
    },
    CAT: {
        RESOURCE_ID: "CAT",
        RUN_SPEED: 0.1,
        WALK_SPEED: 0.05,
        SNEAK_SPEED: 0.02,
        JUMP_SPEED: 0.33,
        CLIMB_SPEED: 0.03,
        INITIAL: {
            state: "sit-right",
            action: "sit",
            physics: {
                position:     { x: 100, y: 1     },
                velocity:     { x: 0, y: 0       },
                acceleration: { x: 0, y: 0       },
                gravity:      { x: 0, y: -0.0005 }
            }
        }
    },
    RESOURCES: [
        { id: "PLAYER",         image: "./assets/player.png",         json: "./assets/player.json"     },
        { id: "CAT",            image: "./assets/cat.png",            json: "./assets/cat.json"        },
        { id: "BACKGROUND",     image: "./assets/background.png",     json: "./assets/background.json" },
        { id: "ICONS",          image: "./assets/icons.png",          json: "./assets/icons.json"      },
        { id: "FONT",           image: "./assets/font.png",           json: "./assets/font.json"       },
        { id: "FONT-HIGHLIGHT", image: "./assets/font-highlight.png", json: "./assets/font.json"       },
        { id: "CURSORS",        image: "./assets/cursors.png",        json: "./assets/cursors.json"    }
    ]
}

export { CONFIG }