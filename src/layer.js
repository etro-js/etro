import {val, PubSub} from "./util.js";

// TODO: implement "layer masks", like GIMP
// TODO: add aligning options, like horizontal and vertical align modes
// TODO: make width/height optional or x/y required?

/**
 * All layers have a
 * - start time
 * - duration
 * - background color
 * - list of effects
 * - an "active" flag
 */
export class Base extends PubSub {
    /**
     * Creates a new empty layer
     *
     * @param {number} startTime - when to start the layer on the movie"s timeline
     * @param {number} duration - how long the layer should last on the movie"s timeline
     */
    constructor(startTime, duration, options={}) {  // rn, options isn't used but I'm keeping it here
        super();
        this._startTime = startTime;
        this._duration = duration;

        this._active = false;   // whether this layer is currently being rendered

        // on attach to movie
        this.subscribe("attach", event => {
            this._movie = event.movie;
        });
    }

    /** Generic step function */
    _render() {}

    get active () { return this._active; }  // readonly
    get startTime() { return this._startTime; }
    set startTime(val) { this._startTime = val; }
    get duration() { return this._duration; }
    set duration(val) { this._duration = val; }
}

/** Any layer that renders to a canvas */
export class Visual extends Base {
    /**
     * Creates a visual layer
     *
     * @param {number} startTime - when to start the layer on the movie"s timeline
     * @param {number} duration - how long the layer should last on the movie"s timeline
     * @param {number} width - the width of the entire layer
     * @param {number} height - the height of the entire layer
     * @param {object} [options] - various optional arguments
     * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
     * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
     * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
     *  for a transparent background
     * @param {object} [options.border=null] - the layer's outline, or <code>null</code> for no outline
     * @param {string} [options.border.color] - the outline's color; required for a border
     * @param {string} [options.border.thickness=1] - the outline's weight
     * @param {number} [options.opacity=1] - the layer's opacity; <code>1</cod> for full opacity
     *  and <code>0</code> for full transparency
     */
    constructor(startTime, duration, width, height, options={}) {
        super(startTime, duration, options);
        this.x = options.x || 0;    // IDEA: make these required arguments
        this.y = options.y || 0;
        this.width = width;
        this.height = height;

        this.effects = [];

        this.background = options.background || null;
        this.border = options.border || null;
        this.opacity = options.opacity || 1;

        this.canvas = document.createElement("canvas");
        this.cctx = this.canvas.getContext("2d");
    }

    /** Render visual output */
    _render(reltime) {
        this._beginRender(reltime);
        this._doRender(reltime);
        this._endRender(reltime);
    }
    _beginRender(reltime) {
        this.canvas.width = val(this.width, reltime);
        this.canvas.height = val(this.height, reltime);
        this.cctx.globalAlpha = val(this.opacity, reltime);
    }
    _doRender(reltime) {
        // canvas.width & canvas.height are already interpolated
        this.cctx.clearRect(0, 0, this.canvas.width, this.canvas.height);      // (0, 0) relative to layer
        if (this.background) {
            this.cctx.fillStyle = val(this.background, reltime);
            this.cctx.fillRect(0, 0, this.canvas.width, this.canvas.height);  // (0, 0) relative to layer
        }
        if (this.border && this.border.color) {
            this.cctx.strokeStyle = val(this.border.color, reltime);
            this.cctx.lineWidth = val(this.border.thickness, reltime) || 1;    // this is optional
        }
    }
    _endRender() {
        if (this.canvas.width * this.canvas.height > 0) this._applyEffects();
        // else InvalidStateError for drawing zero-area image in some effects, right?
    }

    _applyEffects() {
        for (let i=0; i<this.effects.length; i++) {
            let effect = this.effects[i];
            effect.apply(this, this._movie.currentTime - this.startTime);   // pass relative time
        }
    }

    addEffect(effect) { this.effects.push(effect); return this; }
}

export class Text extends Visual {
    // TODO: is textX necessary? it seems inconsistent, because you can't define width/height directly for a text layer
    /**
     * Creates a new text layer
     *
     * @param {number} startTime
     * @param {number} duration
     * @param {string} text - the text to display
     * @param {number} width - the width of the entire layer
     * @param {number} height - the height of the entire layer
     * @param {object} [options] - various optional arguments
     * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
     * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
     * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
     *  for a transparent background
     * @param {object} [options.border=null] - the layer"s outline, or <code>null</code> for no outline
     * @param {string} [options.border.color] - the outline"s color; required for a border
     * @param {string} [options.border.thickness=1] - the outline"s weight
     * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
     *  and <code>0</code> for full transparency
     * @param {string} [options.font="10px sans-serif"]
     * @param {string} [options.color="#fff"]
     * //@param {number} [options.width=textWidth] - the value to override width with
     * //@param {number} [options.height=textHeight] - the value to override height with
     * @param {number} [options.textX=0] - the text's horizontal offset relative to the layer
     * @param {number} [options.textY=0] - the text's vertical offset relative to the layer
     * @param {number} [options.maxWidth=null] - the maximum width of a line of text
     * @param {string} [options.textAlign="start"] - horizontal align
     * @param {string} [options.textBaseline="top"] - vertical align
     * @param {string} [options.textDirection="ltr"] - the text direction
     * TODO: add padding options
     */
    constructor(startTime, duration, text, width, height, options={}) {
        super(startTime, duration, width, height, options);  // fill in zeros in |_doRender|

        this.text = text;
        this.font = options.font || "10px sans-serif";
        this.color = options.color || "#fff";
        this.textX = options.textX || 0;
        this.textY = options.textY || 0;
        this.maxWidth = options.maxWidth || null;
        this.textAlign = options.textAlign || "start";
        this.textBaseline = options.textBaseline || "top";
        this.textDirection = options.textDirection || "ltr";

        // this._prevText = undefined;
        // // because the canvas context rounds font size, but we need to be more accurate
        // // rn, this doesn't make a difference, because we can only measure metrics by integer font sizes
        // this._lastFont = undefined;
        // this._prevMaxWidth = undefined;
    }

    _doRender(reltime) {
        super._doRender(reltime);
        const text = val(this.text, reltime), font = val(this.font, reltime),
            maxWidth = this.maxWidth ? val(this.maxWidth, reltime) : undefined;
        // // properties that affect metrics
        // if (this._prevText !== text || this._prevFont !== font || this._prevMaxWidth !== maxWidth)
        //     this._updateMetrics(text, font, maxWidth);

        this.cctx.font = font;
        this.cctx.fillStyle = val(this.color, reltime);
        this.cctx.textAlign = val(this.textAlign, reltime);
        this.cctx.textBaseline = val(this.textBaseline, reltime);
        this.cctx.textDirection = val(this.textDirection, reltime);
        this.cctx.fillText(
            text, val(this.textX, reltime), val(this.textY, reltime),
            maxWidth
        );

        this._prevText = text;
        this._prevFont = font;
        this._prevMaxWidth = maxWidth;
    }

    // _updateMetrics(text, font, maxWidth) {
    //     // TODO calculate / measure for non-integer font.size values
    //     let metrics = Text._measureText(text, font, maxWidth);
    //     // TODO: allow user-specified/overwritten width/height
    //     this.width = /*this.width || */metrics.width;
    //     this.height = /*this.height || */metrics.height;
    // }

    // TODO: implement setters and getters that update dimensions!

    /*static _measureText(text, font, maxWidth) {
        // TODO: fix too much bottom padding
        const s = document.createElement("span");
        s.textContent = text;
        s.style.font = font;
        s.style.padding = "0";
        if (maxWidth) s.style.maxWidth = maxWidth;
        document.body.appendChild(s);
        const metrics = {width: s.offsetWidth, height: s.offsetHeight};
        document.body.removeChild(s);
        return metrics;
    }*/
}

export class Image extends Visual {
    /**
     * Creates a new image layer
     *
     * @param {number} startTime
     * @param {number} duration
     * @param {HTMLImageElement} media
     * @param {object} [options]
     * @param {number} [options.x=0] - the horizontal position of the layer (relative to the movie)
     * @param {number} [options.y=0] - the vertical position of the layer (relative to the movie)
     * @param {string} [options.background=null] - the background color of the layer, or <code>null</code>
     *  for a transparent background
     * @param {object} [options.border=null] - the layer"s outline, or <code>null</code> for no outline
     * @param {string} [options.border.color] - the outline"s color; required for a border
     * @param {string} [options.border.thickness=1] - the outline"s weight
     * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
     *  and <code>0</code> for full transparency
     * @param {number} [options.clipX=0] - where to place the left edge of the image
     * @param {number} [options.clipY=0] - where to place the top edge of the image
     * @param {number} [options.clipWidth=0] - where to place the right edge of the image
     *  (relative to <code>options.clipX</code>)
     * @param {number} [options.clipHeight=0] - where to place the top edge of the image
     *  (relative to <code>options.clipY</code>)
     * @param {number} [options.imageX=0] - where to place the image horizonally relative to the layer
     * @param {number} [options.imageY=0] - where to place the image vertically relative to the layer
     */
    constructor(startTime, duration, image, options={}) {
        super(startTime, duration, options.width || 0, options.height || 0, options);  // wait to set width & height
        this.image = image;
        // clipX... => how much to show of this.image
        this.clipX = options.clipX || 0;
        this.clipY = options.clipY || 0;
        this.clipWidth = options.clipWidth;
        this.clipHeight = options.clipHeight;
        // imageX... => how to project this.image onto the canvas
        this.imageX = options.imageX || 0;
        this.imageY = options.imageY || 0;

        const load = () => {
            this.width = this.imageWidth = this.width || this.image.width;
            this.height = this.imageHeight = this.height || this.image.height;
            this.clipWidth = this.clipWidth || image.width;
            this.clipHeight = this.clipHeight || image.height;
        };
        if (image.complete) load();
        else image.addEventListener("load", load);
    }

    _doRender(reltime) {
        super._doRender(reltime);  // clear/fill background
        this.cctx.drawImage(
            this.image,
            val(this.clipX, reltime), val(this.clipY, reltime),
            val(this.clipWidth, reltime), val(this.clipHeight, reltime),
            // this.imageX and this.imageY are relative to layer
            val(this.imageX, reltime), val(this.imageY, reltime),
            val(this.imageWidth, reltime), val(this.imageHeight, reltime)
        );
    }
}

/**
 * Any layer that has audio extends this class;
 * Audio and video
 *
 * Special class that is the second super in a diamond inheritance pattern.
 * No need to extend BaseLayer, because the prototype is already handled by the calling class.
 * The calling class will use these methods using `Media.{method name}.call(this, {args...})`.
 */
export class Media {
    /**
     * @param {number} startTime
     * @param {HTMLVideoElement} media
     * @param {object} [options]
     * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
     * @param {numer} [options.duration=media.duration-options.mediaStartTime]
     * @param {boolean} [options.muted=false]
     * @param {number} [options.volume=1]
     * @param {number} [options.speed=1] - the audio's playerback rate
     */
    constructor_(startTime, media, onload, options={}) {
        this.media = media;
        this._mediaStartTime = options.mediaStartTime || 0;
        this.muted = options.muted || false;
        this.volume = options.volume || 1;
        this.speed = options.speed || 1;

        const load = () => {
            if ((options.duration || (media.duration-this.mediaStartTime)) < 0)
                throw "Invalid options.duration or options.mediaStartTime";
            this.duration = options.duration || (media.duration-this.mediaStartTime);
            // onload will use `this`, and can't bind itself because it's before super()
            onload && onload.bind(this)(media, options);
        };
        if (media.readyState >= 2) load(); // this frame's data is available now
        else media.addEventListener("canplay", load);    // when this frame's data is available

        this.subscribe("attach", event => {
            event.movie.subscribe("seek", event => {
                let time = event.movie.currentTime;
                if (time < this.startTime || time >= this.startTime + this.duration) return;
                this.media.currentTime = time - this.startTime;
            });
            // connect to audiocontext
            this.source = event.movie.actx.createMediaElementSource(this.media);
            this.source.connect(event.movie.actx.destination);
        });
        // TODO: on unattach?
        this.subscribe("audiodestinationupdate", event => {
            // reset destination
            this.source.disconnect();
            this.source.connect(event.destination);
        });
        this.subscribe("start", () => {
            this.media.currentTime = this._movie.currentTime + this.mediaStartTime;
            this.media.play();
        });
        this.subscribe("stop", () => {
            this.media.pause();
        });
    }

    _render(reltime) {
        // even interpolate here
        this.media.muted = val(this.muted, reltime);
        this.media.volume = val(this.volume, reltime);
        this.media.speed = val(this.speed, reltime);
    }

    get startTime() { return this._startTime; }
    set startTime(val) {
        super.startTime = val;
        let mediaProgress = this._movie.currentTime - this.startTime;
        this.media.currentTime = mediaProgress + this.mediaStartTime;
    }

    set mediaStartTime(val) {
        this._mediaStartTime = val;
        let mediaProgress = this._movie.currentTime - this.startTime;
        this.media.currentTime = mediaProgress + this.mediaStartTime;
    }
    get mediaStartTime() { return this._mediaStartTime; }
};

// use mixins instead of `extend`ing two classes (which doens't work); see below class def
export class Video extends Visual {
    /**
     * Creates a new video layer
     *
     * @param {number} startTime
     * @param {HTMLVideoElement} media
     * @param {object} [options]
     * @param {number} startTime
     * @param {HTMLVideoElement} media
     * @param {object} [options]
     * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
     * @param {numer} [options.duration=media.duration-options.mediaStartTime]
     * @param {boolean} [options.muted=false]
     * @param {number} [options.volume=1]
     * @param {number} [options.speed=1] - the audio's playerback rate
     * @param {number} [options.mediaStartTime=0] - at what time in the video the layer starts
     * @param {numer} [options.duration=media.duration-options.mediaStartTime]
     * @param {number} [options.clipX=0] - where to place the left edge of the image
     * @param {number} [options.clipY=0] - where to place the top edge of the image
     * @param {number} [options.clipWidth=0] - where to place the right edge of the image
     *  (relative to <code>options.clipX</code>)
     * @param {number} [options.clipHeight=0] - where to place the top edge of the image
     *  (relative to <code>options.clipY</code>)
     * @param {number} [options.mediaX=0] - where to place the image horizonally relative to the layer
     * @param {number} [options.mediaY=0] - where to place the image vertically relative to the layer
     */
    constructor(startTime, media, options={}) {
        // fill in the zeros once loaded
        super(startTime, 0, 0, 0, options);
        // a DIAMOND super!!                                using function to prevent |this| error
        Media.prototype.constructor_.call(this, startTime, media, function(media, options) {
            // by default, the layer size and the video output size are the same
            this.width = this.mediaWidth = options.width || media.videoWidth;
            this.height = this.mediaHeight = options.height || media.videoHeight;
            this.clipWidth = options.clipWidth || media.videoWidth;
            this.clipHeight = options.clipHeight || media.videoHeight;
        }, options);
        // clipX... => how much to show of this.media
        this.clipX = options.clipX || 0;
        this.clipY = options.clipY || 0;
        // mediaX... => how to project this.media onto the canvas
        this.mediaX = options.mediaX || 0;
        this.mediaY = options.mediaY || 0;
    }

    _doRender(reltime) {
        super._doRender();
        this.cctx.drawImage(this.media,
            val(this.clipX, reltime), val(this.clipY, reltime),
            val(this.clipWidth, reltime), val(this.clipHeight, reltime),
            val(this.mediaX, reltime), val(this.mediaY, reltime),    // relative to layer
            val(this.mediaWidth, reltime), val(this.mediaHeight, reltime));
    }

    // "inherited" from Media (TODO!: find a better way to mine the diamond pattern)
    // GET RID OF THIS PATTERN!! This is **ugly**!!
    get startTime() {
        return Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
            .get.call(this);
    }
    set startTime(val) {
        Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
            .set.call(this, val);
    }
    get mediaStartTime() {
        return Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
            .get.call(this);
    }
    set mediaStartTime(val) {
        Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
            .set.call(this, val);
    }
}

export class Audio extends Base {
    /**
     * Creates an audio layer
     *
     * @param {number} startTime
     * @param {HTMLAudioElement} media
     * @param {object} [options]
     * @param {number} startTime
     * @param {HTMLVideoElement} media
     * @param {object} [options]
     * @param {number} [options.mediaStartTime=0] - at what time in the audio the layer starts
     * @param {numer} [options.duration=media.duration-options.mediaStartTime]
     * @param {boolean} [options.muted=false]
     * @param {number} [options.volume=1]
     * @param {number} [options.speed=1] - the audio's playerback rate
     */
    constructor(startTime, media, options={}) {
        // fill in the zero once loaded, no width or height (will raise error)
        super(startTime, 0, -1, -1, options);   // TODO: -1 or 0?
        Media.prototype.constructor_.call(this, startTime, media, null, options);
    }

    /* Do not render anything */
    _beginRender() {}
    _doRender() {}
    _endRender() {}

    // "inherited" from Media (TODO!: find a better way to mine the diamond pattern)
    // GET RID OF THIS PATTERN!! This is **ugly**!!
    get startTime() {
        return Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
            .get.call(this);
    }
    set startTime(val) {
        Object.getOwnPropertyDescriptor(Media.prototype, "startTime")
            .set.call(this, val);
    }
    get mediaStartTime() {
        return Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
            .get.call(this);
    }
    set mediaStartTime(val) {
        Object.getOwnPropertyDescriptor(Media.prototype, "mediaStartTime")
            .set.call(this, val);
    }
}
