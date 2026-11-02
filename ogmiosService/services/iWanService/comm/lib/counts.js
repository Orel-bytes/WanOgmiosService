class CountsPerMinute {
    static MAX_MINUTES = 30;
    static formatMinute() {
        return Math.floor(Date.now()/60000);
    }
    constructor(maxMinutes) {
        this.status = [];
        this.maxMinutes = maxMinutes || this.constructor.MAX_MINUTES;
    }

    add() {
        const currentMinute = this.constructor.formatMinute();
        const index = this.status.findIndex(v => v.minute == currentMinute);
        if (index < 0) {
            this.status.push({minute:currentMinute, count:1});
        } else {
            this.status[index].count += 1;
        }
        this.cleanup();
    }

    count() {
        this.cleanup();
        return this.status.reduce((acc, obj) =>  acc + obj.count, 0);
    }

    cleanup() {
        if (this.status.length > this.maxMinutes) {
            this.status = this.status.slice(-this.maxMinutes);
        }
        const currentMinute = this.constructor.formatMinute();
        const minMinute = currentMinute - this.maxMinutes + 1;
        const nearestIndex = this.status.findIndex(v => v.minute >= minMinute);
        if (nearestIndex !== -1) {
            this.status = this.status.slice((nearestIndex));
        }
    }
}

exports.CountsPerMinute = CountsPerMinute;