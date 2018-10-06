import Effect from "../core/effect.js";
import {cosineInterp} from "../core/util.js";

// TODO: investigate why an effect might run once in the beginning even if its layer isn't at the beginning
// TODO: implement keyframes :]]]]

/* UTIL */
function map(mapper, canvas, ctx, x, y, width, height, flush=true) {
    x = x || 0;
    y = y || 0;
    width = width || canvas.width;
    height = height || canvas.height;
    let frame = ctx.getImageData(x, y, width, height);
    for (let i=0,l=frame.data.length; i<l; i+=4)
        mapper(frame.data, i);
    if (flush) ctx.putImageData(frame, x, y);
}

/* COLOR & TRANSPARENCY */
export class Transparency extends Effect {
    constructor(opacity=0.5) {
        super();
        this.opacity = opacity;
    }
    apply(target) {
        map((data, start) => { data[start+3] = this.opacity * 255; }, target.canvas, target.cctx);
    }
}

export class Brightness extends Effect {
    constructor(brightness=1.0) {
        super();
        this.brightness = brightness;
    }
    apply(target) {
        map((data, start) => {
            for (let i=0; i<3; i++) data[start+i] *= this.brightness;
        }, target.canvas, target.cctx);
    }
}

export class Contrast extends Effect {
    constructor(contrast=1.0) {
        super();
        this.contrast = contrast;
    }
    apply(target) {
        map((data, start) => {
            for (let i=0; i<3; i++) data[start+i] = this.contrast * (data[start+i] - 128) + 128;
        }, target.canvas, target.cctx);
    }
}

/**
 * Multiplies each channel by a constant
 */
export class Channels extends Effect {
    constructor(channels) {
        super();
        this.r = channels.r || 1.0;
        this.g = channels.g || 1.0;
        this.b = channels.b || 1.0;
        this.a = channels.a || 1.0;
    }
    apply(target) {
        map((data, start) => {
            data[start+0] *= this.r;
            data[start+1] *= this.g;
            data[start+2] *= this.b;
            data[start+3] *= this.a;
        }, target.canvas, target.cctx);
    }
}

export class ChromaKey extends Effect {
    /**
     * @param {Color} [target={r: 0, g: 0, b: 0}] - the color to target
     * @param {number} [threshold=0] - how much error is allowed
     * @param {boolean|string} [smoothing=false] - the smoothing mode; support values:
     *  <ul>
     *      <li><code>"linear"</code></li>
     *      <li><code>"cosine"</code></li>
     *      <li><code>false</code> to disable smoothing</li>
     *  </ul>
     * @param {number} [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable
     */
    // TODO: use smoothingSharpness
    constructor(target={r: 0, g: 0, b: 0}, threshold=0, smoothing=false, smoothingSharpness=0) {
        super();
        this.target = target;
        this.threshold = threshold;
        this.smoothing = smoothing;
        this.smoothingSharpness = smoothingSharpness;
    }
    apply(target) {
        map((data, start) => {
            let r = data[start+0];
            let g = data[start+1];
            let b = data[start+2];
            if (!this.smoothing) {
                // standard dumb way that most video editors do it (all-or-nothing method)
                let transparent = (Math.abs(r - this.target.r) <= threshold)
                    && (Math.abs(g - this.target.g) <= threshold)
                    && (Math.abs(b - this.target.b) <= threshold);
                if (transparent) data[start+3] = 0;
            } else {
                /*
                    better way IMHO:
                    Take the average of the absolute differences between the pixel and the target for each channel
                */
                let dr = Math.abs(r - this.target.r);
                let dg = Math.abs(g - this.target.g);
                let db = Math.abs(b - this.target.b);
                let transparency = (dr + dg + db) / 3;
                switch (this.smoothing) {
                    case "linear": { break; }
                    case "cosine": { transparency = cosineInterp(0, 255, transparency/255); break; }
                    default: { throw "Invalid smoothing type"; }
                }
                data[start+3] = transparency;
            }
        }, target.canvas, target.cctx);
    }
}

/* BLUR */
// TODO: make sure this is truly gaussian even though it doens't require a standard deviation
// TODO: improve performance and/or make more powerful
export class GuassianBlur extends Effect {
    constructor(radius) {
        if (radius % 2 !== 1 || radius <= 0) throw "Radius should be an odd natural number";
        super();
        this.radius = radius;
    }
    apply(target) {
        // TODO: get rid of tmpCanvas and just take advantage of image data's immutability
        let tmpCanvas = document.createElement("canvas"),
            tmpCtx = tmpCanvas.getContext("2d");
        tmpCanvas.width = target.canvas.width;
        tmpCanvas.height = target.canvas.height;
        let imageData = target.cctx.getImageData(0, 0, target.canvas.width, target.canvas.height);
        let tmpImageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        // only one dimension (either x or y) of the kernel
        let kernel = gen1DKernel(this.radius);
        let kernelStart = -(this.radius-1) / 2, kernelEnd = -kernelStart;
        // vertical pass
        for (let x=0; x<tmpCanvas.width; x++) {
            for (let y=0; y<tmpCanvas.height; y++) {
                let r=0, g=0, b=0, a=imageData.data[4*(tmpCanvas.width*y+x)+3];
                // apply kernel
                for (let kernelY=kernelStart; kernelY<=kernelEnd; kernelY++) {
                    if (y+kernelY >= tmpCanvas.height) break;
                    let kernelIndex = kernelY - kernelStart; // actual array index (not y-coordinate)
                    let weight = kernel[kernelIndex];
                    let ki = 4*(tmpCanvas.width*(y+kernelY)+x);
                    r += weight * imageData.data[ki + 0];
                    g += weight * imageData.data[ki + 1];
                    b += weight * imageData.data[ki + 2];
                }
                let i = 4*(tmpCanvas.width*y+x);
                tmpImageData.data[i + 0] = r;
                tmpImageData.data[i + 1] = g;
                tmpImageData.data[i + 2] = b;
                tmpImageData.data[i + 3] = a;
            }
        }
        imageData = tmpImageData;   // pipe the previous ouput to the input of the following code
        tmpImageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);    // create new output space
        // horizontal pass
        for (let y=0; y<tmpCanvas.height; y++) {
            for (let x=0; x<tmpCanvas.width; x++) {
                let r=0, g=0, b=0, a=imageData.data[4*(tmpCanvas.width*y+x)+3];
                // apply kernel
                for (let kernelX=kernelStart; kernelX<=kernelEnd; kernelX++) {
                    if (x+kernelX >= tmpCanvas.width) break;
                    let kernelIndex = kernelX - kernelStart; // actual array index (not y-coordinate)
                    let weight = kernel[kernelIndex];
                    let ki = 4 * (tmpCanvas.width*y+(x+kernelX));
                    r += weight * imageData.data[ki + 0];
                    g += weight * imageData.data[ki + 1];
                    b += weight * imageData.data[ki + 2];
                }
                let i = 4*(tmpCanvas.width*y+x);
                tmpImageData.data[i + 0] = r;
                tmpImageData.data[i + 1] = g;
                tmpImageData.data[i + 2] = b;
                tmpImageData.data[i + 3] = a;
            }
        }
        target.cctx.putImageData(tmpImageData, 0, 0);
    }
}
function gen1DKernel(radius) {
    let pascal = genPascalRow(radius);
    // don't use `reduce` and `map` (overhead?)
    let sum = 0;
    for (let i=0; i<pascal.length; i++)
        sum += pascal[i];
    for (let i=0; i<pascal.length; i++)
        pascal[i] /= sum;
    return pascal;
}
function genPascalRow(index) {
    if (index < 0) throw `Invalid index ${index}`;
    let currRow = [1];
    for (let i=1; i<index; i++) {
        let nextRow = [];
        nextRow.length = currRow.length + 1;
        // edges are always 1's
        nextRow[0] = nextRow[nextRow.length-1] = 1;
        for (let j=1; j<nextRow.length-1; j++)
            nextRow[j] = currRow[j-1] + currRow[j];
        currRow = nextRow;
    }
    return currRow;
}

// TODO: implement directional blur
// TODO: implement radial blur
// TODO: implement zoom blur

/* DISTORTION */
export class Transform {
    constructor(matrix) {
        this.matrix = matrix;
        this.tmpCanvas = document.createElement("canvas");
        this.tmpCtx = this.tmpCanvas.getContext("2d");
    }

    apply(target) {
        if (target.canvas.width !== this.tmpCanvas.width) this.tmpCanvas.width = target.canvas.width;
        if (target.canvas.height !== this.tmpCanvas.height) this.tmpCanvas.height = target.canvas.height;
        this.tmpCtx.setTransform(
            this.matrix.a, this.matrix.b, this.matrix.c,
            this.matrix.d, this.matrix.e, this.matrix.f,
        );
        this.tmpCtx.drawImage(target.canvas, 0, 0);
        // Assume it was identity for now
        this.tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1);
        target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
        target.cctx.drawImage(this.tmpCanvas, 0, 0);
    }
}
/** @class
 * A 3x3 matrix for storing 2d transformations
 */
Transform.Matrix = class Matrix {
    constructor(data) {
        this.data = data || [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }

    identity() {
        for (let i=0; i<this.data.length; i++)
            this.data[i] = Transform.Matrix.IDENTITY.data[i];

        return this;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} [val]
     */
    cell(x, y, val) {
        if (val !== undefined) this.data[3*y + x] = val;
        return this.data[3*y + x];
    }

    /* For canvas context setTransform */
    get a() { return this.data[0]; }
    get b() { return this.data[3]; }
    get c() { return this.data[1]; }
    get d() { return this.data[4]; }
    get e() { return this.data[2]; }
    get f() { return this.data[5]; }

    multiply(other) {
        // copy to temporary matrix to avoid modifying `this` while reading from it
        // http://www.informit.com/articles/article.aspx?p=98117&seqNum=4
        for (let x=0; x<3; x++) {
            for (let y=0; y<3; y++) {
                let sum = 0;
                for (let i=0; i<3; i++)
                    sum += this.cell(x, i) * other.cell(i, y);
                TMP_MATRIX.cell(x, y, sum);
            }
        }
        // copy data from TMP_MATRIX to this
        for (let i=0; i<TMP_MATRIX.data.length; i++)
            this.data[i] = TMP_MATRIX.data[i];
        return this;
    }

    translate(x, y) {
        this.multiply(new Transform.Matrix([
            1, 0, 0,
            0, 1, 0,
            x, y, 1
        ]));

        return this;
    }

    scale(x, y) {
        this.multiply(new Transform.Matrix([
            x, 0, 0,
            0, y, 0,
            0, 0, 1
        ]));

        return this;
    }

    rotate(a) {
        let c = Math.cos(a), s = Math.sin(a);
        this.multiply(new Transform.Matrix([
            c, s, 0,
           -s, c, 0,
            0, 0, 1
        ]));

        return this;
    }
};
Transform.Matrix.IDENTITY = new Transform.Matrix();
const TMP_MATRIX = new Transform.Matrix();

// TODO: when using AudioContext, support reverb
