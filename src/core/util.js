/**
 * @param {string} str
 * @return {object} the parsed color
 */
export function parseColor(str) {
    // TODO: support HSL colors
    let channels, alpha;
    if (str.startsWith("#")) {
        str = str.substring(1);
        let stride = str.length === 6 || str.length === 8 ? 2 : 1;
        if (stride === 1) str = str
            .split("")
            .reduce((color, channel) => color + channel + channel, "");
        alpha = str.length % 4 === 0;
        channels = str.match(/.{2}/g).map(hex => parseInt(hex, 16));
    } else if (str.startsWith("rgb")) {
        alpha = str[3] === "a"; // as in 'rgba'
        str = str.substring(str.indexOf("("), str.indexOf(")"));
        channels = str.split(",").map(dec => parseInt(dec));
    } else {
        throw `Invalid color string: ${str}`;
    }

    return {r: channels[0], g: channels[1], b: channels[2], a: alpha ? channels[3] : 255};
}

export function linearInterp(x1, x2, t) {
    return (1-t) * x1 + t * x2;
}
export function cosineInterp(x1, x2, t) {
    let cos = Math.cos(Math.PI / 2 * t);
    return cos * x1 + (1-cos) * x2;
}

export class Interface {
    /**
     * @param {function[]} methods
     */
    constructor(methods) {
        this.methods = methods;
    }

    /**
     * @param {object} object - literally any object
     */
    apply(object) {
        for (let name in this.methods) {
            if (!this.methods.hasOwnProperty(name)) continue;
            object[name] = this.methods[name];
        }
    }
}

export const Eventable = new Interface({
    /*_*/subscribe: function(type, callback) {   // should always be public
        let callbacks = this._callbacks || (this._callbacks = {});
        (this._callbacks[type] || (this._callbacks[type] = [])).push(callback);
    },
    _publish: function(type, event) {
        if (!this._callbacks || !this._callbacks[type]) return;
        for (let i=0,l=this._callbacks[type].length; i<l; i++) {
            let callback = this._callbacks[type][i];
            callback(event);
        }
        return event;
    }
});
