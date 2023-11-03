"use strict";

//  ===================================================[ IMPORTS ]

import "./howler.core.min.js"

// |===================================================|
// |                     STEREO                        |
// |===================================================|
// | Responsible for all game audio.                   |
// |===================================================|

class Stereo {
    // mutes all game audio; sounds and music
    mute;

    // game music
    music;

    // collection of game sounds as functions
    // * sounds are triggered by entity states; animation state and frame, or ability
    // * sounds are triggered by collisions; entity and boundary collisions
    sounds;

    // the audio system requires a collection of audio files and labels
    // this collection is parsed over and sorted into the appropriate objects
    // * each sound object has a trigger condition, in addition to a manual trigger
    // * config is found in the config file and sets initial values
    constructor() {
        // mute by default
        this.mute = true;
    }

    // delay creation of audio contexts until user has interacted with webpage
    // * as per best practices
    initialize(config) {
        // setup theme music
        // * should loop
        this.music = new Howl({
            src: [config.MUSIC.theme_1.aac, config.MUSIC.theme_1.mp3],
            volume: config.MUSIC.theme_1.volume,
            loop: true
        });

        // setup sound fx
        this.sounds = {};
        Object.keys(config.SOUNDS).forEach((label) => {
            let sound = new Howl({
                src: [config.SOUNDS[label].aac, config.SOUNDS[label].mp3],
                volume: config.SOUNDS[label].volume
            });
            this.sounds[label] = sound;
        });
    }

    // mutes or unmutes game audio, returns new mute boolean
    // * music continues to play when muted, however volume is set to 0
    toggle_mute() {
        this.mute = !this.mute;
        if (this.mute) {
            this.music.pause();
        }
        else {
            this.music.play();
        }
        return this.mute;
    }

    // play a sound bite
    // forcing if needed in case of mute
    play(label, force = null) {
        force ??= false;
        if (!this.mute || force) {
            this.sounds[label].play();
        }
    }

    // stop a sound bite and set its seek to 0
    stop(label) {
        this.sounds[label].stop();
    }
}

export { Stereo }