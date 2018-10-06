import {Eventable} from "./util.js";

/**
 * All layers have a
 * - start time
 * - duration
 * - background color
 * - list of effects
 * - an "active" flag
 */
export class Layer {
    /**
     * Creates a new empty layer
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
     * @param {object} [options.border=null] - the layer"s outline, or <code>null</code> for no outline
     * @param {string} [options.border.color] - the outline"s color; required for a border
     * @param {string} [options.border.thickness=1] - the outline"s weight
     * @param {number} [options.opacity=1] - the layer"s opacity; <code>1</cod> for full opacity
     *  and <code>0</code> for full transparency
     */
    constructor(startTime, duration, width, height, options={}) {
        this.startTime = startTime;
        this.duration = duration;

        this.x = options.x || 0;
        this.y = options.y || 0;

        this.effects = [];
        this.active = false;   // whether this layer is currently being rendered

        this.background = options.background || null;
        this.border = options.border || null;
        this.opacity = options.opacity || 1;

        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.cctx = this.canvas.getContext("2d");

        // on attach to movie
        this.subscribe("attach", event => {
            this._movie = event.movie;
        });
    }

    /** "Use" layer */
    _render() {
        this._beginRender();
        this._doRender();
        this._endRender();
    }
    _beginRender() {
        // this.cctx.save();     trying to improve performance, uncomment if necessary
        this.cctx.globalAlpha = this.opacity;
    }
    _doRender() {
        this.cctx.clearRect(0, 0, this.width, this.height);      // (0, 0) relative to layer
        if (this.background) {
            this.cctx.fillStyle = this.background;
            this.cctx.fillRect(0, 0, this.width, this.height);  // (0, 0) relative to layer
        }
        if (this.border && this.border.color) {
            this.cctx.strokeStyle = this.border.color;
            this.cctx.lineWidth = this.border.thickness || 1;    // this is optional
        }
    }
    _endRender() {
        this._applyEffects();
        // this.cctx.restore();      trying to perfect performance, uncomment if necessary
    }

    _applyEffects() {
        for (let i=0; i<this.effects.length; i++) {
            let effect = this.effects[i];
            effect.apply(this, this._movie);
        }
    }

    addEffect(effect) { this.effects.push(effect); return this; }

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }
    set width(val) { this.canvas.width = val; }
    set height(val) { this.canvas.height = val; }
}

Eventable.apply(Layer.prototype);

export class TextLayer extends Layer {
    /**
     * Creates a new text layer
     *
     * @param {number} startTime
     * @param {number} duration
     * @param {string} text - the text to display
     * @param {object} [options] - various optional arguments
     * @param {string} [options.font="10px sans-serif"]
     * @param {string} [options.color="#fff"]
     * @param {number} [options.textX=0] - the text's horizontal offset relative to the layer
     * @param {number} [options.textY=0] - the text's vertical offset relative to the layer
     * @param {number} [options.maxWidth=null] - the maximum width of a line of text
     * @param {number} [options.textAlign="start"] - horizontal align
     * @param {number} [options.textBaseLine="alphabetic"] - vertical align
     */
    constructor(startTime, duration, text, options={}) {
        let tmpCanvas = document.createElement("canvas"),
            tmpCtx = tmpCanvas.getContext("2d");
        if (options.font) tmpCtx.font = options.font;   // or else use default font
        let metrics = tmpCtx.measureText(text);
        super(startTime, duration, metrics.width, metrics.height, options);

        this.font = tmpCtx.font;    // works with default font, too
        this.color = options.color || "#fff";
        this.textX = options.textX || 0;
        this.textY = options.textY || 0;
        this.maxWidth = options.maxWidth || null;
        this.textAlign = options.textAlign || "start";
        this.textBaseLine = options.textBaseLine || "alphabetic";
    }

    _doRender() {
        super._doRender();
        this.cctx.font = this.font;
        this.cctx.fillStyle = this.color;
        this.cctx.textAlign = this.textAlign;
        this.cctx.textBaseLine = this.textBaseLine;
        this.cctx.fillText(
            this.text, this.textX, this.textY, this.maxWidth !== null ? this.maxWidth : undefined
        );
    }
}

// TODO: make VisualMediaLayer or something as superclass for image and video? probably not

export class ImageLayer extends Layer {
    /**
     * Creates a new image layer
     *
     * @param {number} startTime
     * @param {number} duration
     * @param {HTMLImageElement} media
     * @param {object} [options]
     * @param {number} [options.clipX=0] - where to place the left edge of the image
     * @param {number} [options.clipY=0] - where to place the top edge of the image
     * @param {number} [options.clipWidth=0] - where to place the right edge of the image
     *  (relative to <code>options.clipX</code>)
     * @param {number} [options.clipHeight=0] - where to place the top edge of the image
     *  (relative to <code>options.clipY</code>)
     * @param {number} [options.mediaX=0] - where to place the image horizonally relative to the layer
     * @param {number} [options.mediaY=0] - where to place the image vertically relative to the layer
     */
    constructor(startTime, duration, media, options={}) {
        super(startTime, duration, options.width || 0, options.height || 0, options);  // wait to set width & height
        this.media = media;
        // clipX... => how much to show of this.media
        this.clipX = options.clipX || 0;
        this.clipY = options.clipY || 0;
        this.clipWidth = options.clipWidth;
        this.clipHeight = options.clipHeight;
        // mediaX... => how to project this.media onto the canvas
        this.mediaX = options.mediaX || 0;
        this.mediaY = options.mediaY || 0;

        const load = () => {
            this.width = this.mediaWidth = this.width || this.media.width;
            this.height = this.mediaHeight = this.height || this.media.height;
            this.clipWidth = this.clipWidth || media.width;
            this.clipHeight = this.clipHeight || media.height;
        };
        if (media.complete) load();
        else media.addEventListener("load", load);
    }

    _doRender() {
        super._doRender();  // clear/fill background
        this.cctx.drawImage(
            this.media,
            this.clipX, this.clipY, this.clipWidth, this.clipHeight,
            // this.mediaX and this.mediaY are relative to layer; ik it's weird to pass mediaX in for destX
            this.mediaX, this.mediaY, this.media.width, this.media.height
        );
    }
}

/**
 * Any layer that has audio extends this class;
 * Audio and video
 */
export class MediaLayer extends Layer {
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
    constructor(startTime, media, width, height, onload, options={}) {
        super(startTime, 0, width, height, options);
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
        this.subscribe("audiodestinationupdate", event => {
            // reset destination
            this.source.disconnect();
            this.source.connect(event.destination);
        });
        this.subscribe("start", () => {
            this.media.currentTime = this.mediaStartTime;
            this.media.play();
        });
        this.subscribe("stop", () => {
            this.media.pause();
        });
    }

    set mediaStartTime(startTime) {
        this.startTime = startTime;
        let mediaProgress = this._movie.currentTime - this.startTime;
        this.media.currentTime = mediaProgress + this.mediaStartTime;
    }
    get mediaStartTime() { return this._mediaStartTime; }

    set muted(muted) { this.media.muted = muted; }
    set volume(volume) { this.media.volume = volume; }
    set speed(speed) { this.media.speed = speed; }

    get muted() { return this.media.muted; }
    get volume() { return this.media.volume; }
    get speed() { return this.media.speed; }
}

export class VideoLayer extends MediaLayer {
    /**
     * Creates a new video layer
     *
     * @param {number} startTime
     * @param {HTMLVideoElement} media
     * @param {object} [options]
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
        super(startTime, media, 0, 0, function(media, options) { // using function to prevent |this| error
            // by default, the layer size and the video output size are the same
            this.width = this.mediaWidth = options.width || media.videoWidth;
            this.height = this.mediaHeight = options.height || media.videoHeight;
            this.clipWidth = options.clipWidth || media.videoWidth;
            this.clipHeight = options.clipHeight || media.videoHeight;
        }, options); // fill in the zeros once loaded
        // clipX... => how much to show of this.media
        this.clipX = options.clipX || 0;
        this.clipY = options.clipY || 0;
        // mediaX... => how to project this.media onto the canvas
        this.mediaX = options.mediaX || 0;
        this.mediaY = options.mediaY || 0;
    }

    _doRender() {
        super._doRender();
        this.cctx.drawImage(this.media,
            this.clipX, this.clipY, this.clipWidth, this.clipHeight,
            this.mediaX, this.mediaY, this.width, this.height); // relative to layer
    }
}

export class AudioLayer extends MediaLayer {
    /**
     * Creates an audio layer
     *
     * @param {number} startTime
     * @param {HTMLAudioElement} media
     * @param {object} [options]
     */
    constructor(startTime, media, options={}) {
        // fill in the zero once loaded, no width or height (will raise error)
        super(startTime, media, -1, -1, null, options);
    }

    /* Do not render anything */
    _beginRender() {}
    _doRender() {}
    _endRender() {}
}
