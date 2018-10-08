/**
 * Converts a hex, <code>rgb</code>, or <code>rgba</code> color string to an object representation.
 * Mostly used in image processing effects.
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

/*/*
 * Attempts to solve the diamond inheritance problem using mixins
 * See {@link http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/}<br>
 *
 * <strong>Note that the caller has to explicitly update the class value and as well as the class's property
 * <code>constructor</code> to its prototype's constructor.</strong><br>
 *
 * This throws an error when composing functions with return values; unless if the composed function is a
 * constructor, which is handled specially.
 *
 * Note that all properties must be functions for this to work as expected.
 *
 * If the destination and source have the methods with the same name (key), assign a new function
 * that calls both with the given arguments. The arguments list passed to each subfunction will be the
 * argument list that was called to the composite function.
 *
 * This function only works with functions, getters and setters.
 *
 * TODO: make a lot more robust
 * TODO: rethink my ways... this is evil
 */
/*export function extendProto(destination, source) {
    for (let name in source) {
        const extendMethod = (sourceDescriptor, which) => {
            let sourceFn = sourceDescriptor[which],
                origDestDescriptor = Object.getOwnPropertyDescriptor(destination, name),
                origDestFn = origDestDescriptor ? origDestDescriptor[which] : undefined;
            let destFn = !origDestFn ? sourceFn : function compositeMethod() {   // `function` or `()` ?
                try {
                    // |.apply()| because we're seperating the method from the object, so return the value
                    // of |this| back to the function
                    let r1 = origDestFn.apply(this, arguments),
                        r2 = sourceFn.apply(this, arguments);
                    if (r1 || r2) throw "Return value in composite method"; // null will slip by ig
                } catch (e) {
                    if (e.toString() === "TypeError: class constructors must be invoked with |new|") {
                        let inst = new origDestFn(...arguments);
                        sourceFn.apply(inst, arguments);
                        return inst;
                    } else throw e;
                }
            };

            let destDescriptor = {...sourceDescriptor}; // shallow clone
            destDescriptor[which] = destFn;
            Object.defineProperty(destination, name, destDescriptor);
        };

        let descriptor = Object.getOwnPropertyDescriptor(source, name);
        if (descriptor) {   // if hasOwnProperty
            if (descriptor.get) extendMethod(descriptor, 'get');
            if (descriptor.set) extendMethod(descriptor, 'set');
            if (descriptor.value) extendMethod(descriptor, 'value');
        }
    }
}*/

export class PubSub {
    /*_*/subscribe(type, callback) {   // should always be public
        let callbacks = this._callbacks || (this._callbacks = {});
        (this._callbacks[type] || (this._callbacks[type] = [])).push(callback);
    }
    _publish(type, event) {
        if (!this._callbacks || !this._callbacks[type]) return;
        for (let i=0,l=this._callbacks[type].length; i<l; i++)
            this._callbacks[type][i](event);
        return event;
    }
}
