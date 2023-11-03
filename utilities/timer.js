// |===================================================|
// |                     TIMER                         |
// |===================================================|
// | Simple utility class for a countdown timer.       |
// |===================================================|

class Timer {
    // is timer counting
    active;

    // countdown and fixed duration
    countdown;
    duration;

    // a timer consists of an active countdown status,
    // current countdown, and fixed duration
    constructor(duration = null) {
        duration ??= 0;

        this.active = false;
        this.countdown = duration;
        this.duration = duration;
    }

    // set and trigger the timer countdown
    start(duration = null) {
        duration ??= this.duration;

        this.active = true;
        this.countdown = duration;
    }

    // decrement the countdown timer and if it reaches 0 
    // set active to false and return true otherwise false
    decrement(ms) {
        if (!this.active) {
            return false;
        }

        this.countdown -= ms;
        if (this.countdown <= 0) {
            this.active = false;
            return true;
        }
        else {
            return false;
        }
    }

    // manually terminate countdown
    reset() {
        this.active = false;
        this.countdown = 0;
    }
}

export { Timer }