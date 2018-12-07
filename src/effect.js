// TODO: investigate why an effect might run once in the beginning even if its layer isn't at the beginning
// TODO: Add audio effect support
import {val, linearInterp, cosineInterp} from "./util.js";

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

/**
 * Any effect that modifies the visual contents of a layer.
 *
 * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
 * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
 * different module.</em>
 */
export class Base {
    // subclasses must implement apply
    apply(target, time) {
        throw "No overriding method found or super.apply was called";
    }
}

/* COLOR & TRANSPARENCY */
/** Changes the brightness */
export class Brightness extends Base {
    constructor(brightness=1.0) {
        super();
        this.brightness = brightness;
    }
    apply(target, time) {
        const brightness = val(this.brightness, time);
        map((data, start) => {
            for (let i=0; i<3; i++) data[start+i] *= brightness;
        }, target.canvas, target.cctx);
    }
}

/** Changes the contrast */
export class Contrast extends Base {
    constructor(contrast=1.0) {
        super();
        this.contrast = contrast;
    }
    apply(target, time) {
        const contrast = val(this.contrast, time);
        map((data, start) => {
            for (let i=0; i<3; i++) data[start+i] = contrast * (data[start+i] - 128) + 128;
        }, target.canvas, target.cctx);
    }
}

/**
 * Multiplies each channel by a different constant
 */
export class Channels extends Base {
    constructor(factors) {
        super();
        this.factors = factors;
    }
    apply(target, time) {
        const factors = val(this.factors, time);
        if (factors.a > 1 || (factors.r < 0 || factors.g < 0 || factors.b < 0 || factors.a < 0))
            throw "Invalid channel factors";
        map((data, start) => {
            data[start+0] *= factors.r || 1;    // do default's here to account for keyframes
            data[start+1] *= factors.g || 1;
            data[start+2] *= factors.b || 1;
            data[start+3] *= factors.a || 1;
        }, target.canvas, target.cctx);
    }
}

/**
 * Reduces alpha for pixels which, by some criterion, are close to a specified target color
 */
export class ChromaKey extends Base {
    /**
     * @param {Color} [target={r: 0, g: 0, b: 0}] - the color to target
     * @param {number} [threshold=0] - how much error is allowed
     * @param {boolean|function} [interpolate=null] - the function used to interpolate the alpha channel,
     *  creating an anti-aliased alpha effect, or a falsy value for no smoothing (i.e. 255 or 0 alpha)
     * (@param {number} [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable)
     */
    // TODO: use smoothingSharpness
    constructor(targetColor={r: 0, g: 0, b: 0}, threshold=0, interpolate=null/*, smoothingSharpness=0*/) {
        super();
        this.targetColor = target;
        this.threshold = threshold;
        this.interpolate = interpolate;
        // this.smoothingSharpness = smoothingSharpness;
    }
    apply(target, time) {
        const targetColor = val(this.targetColor, time), threshold = val(this.threshold, time),
            interpolate = val(this.interpolate, time),
            smoothingSharpness = val(this.smoothingSharpness, time);
        map((data, start) => {
            let r = data[start+0];
            let g = data[start+1];
            let b = data[start+2];
            if (!interpolate) {
                // standard dumb way that most video editors probably do it (all-or-nothing method)
                let transparent = (Math.abs(r - targetColor.r) <= threshold)
                    && (Math.abs(g - targetColor.g) <= threshold)
                    && (Math.abs(b - targetColor.b) <= threshold);
                if (transparent) data[start+3] = 0;
            } else {
                /*
                    better way IMHO:
                    Take the average of the absolute differences between the pixel and the target for each channel
                */
                let dr = Math.abs(r - targetColor.r);
                let dg = Math.abs(g - targetColor.g);
                let db = Math.abs(b - targetColor.b);
                let transparency = (dr + dg + db) / 3;
                transparency = interpolate(0, 255, transparency/255);  // TODO: test
                data[start+3] = transparency;
            }
        }, target.canvas, target.cctx);
    }
}

/* BLUR */
// TODO: make sure this is truly gaussian even though it doens't require a standard deviation
// TODO: improve performance and/or make more powerful
/** Applies a Guassian blur */
export class GuassianBlur extends Base {
    constructor(radius) {
        if (radius % 2 !== 1 || radius <= 0) throw "Radius should be an odd natural number";
        super();
        this.radius = radius;
        // TODO: get rid of tmpCanvas and just take advantage of image data's immutability
        this._tmpCanvas = document.createElement("canvas");
        this._tmpCtx = this._tmpCanvas.getContext("2d");
    }
    apply(target, time) {
        if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
        if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
        const radius = val(this.radius, time);

        let imageData = target.cctx.getImageData(0, 0, target.canvas.width, target.canvas.height);
        let tmpImageData = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
        // only one dimension (either x or y) of the kernel
        let kernel = gen1DKernel(Math.round(radius));
        let kernelStart = -(radius-1) / 2, kernelEnd = -kernelStart;
        // vertical pass
        for (let x=0; x<this._tmpCanvas.width; x++) {
            for (let y=0; y<this._tmpCanvas.height; y++) {
                let r=0, g=0, b=0, a=imageData.data[4*(this._tmpCanvas.width*y+x)+3];
                // apply kernel
                for (let kernelY=kernelStart; kernelY<=kernelEnd; kernelY++) {
                    if (y+kernelY >= this._tmpCanvas.height) break;
                    let kernelIndex = kernelY - kernelStart; // actual array index (not y-coordinate)
                    let weight = kernel[kernelIndex];
                    let ki = 4*(this._tmpCanvas.width*(y+kernelY)+x);
                    r += weight * imageData.data[ki + 0];
                    g += weight * imageData.data[ki + 1];
                    b += weight * imageData.data[ki + 2];
                }
                let i = 4*(this._tmpCanvas.width*y+x);
                tmpImageData.data[i + 0] = r;
                tmpImageData.data[i + 1] = g;
                tmpImageData.data[i + 2] = b;
                tmpImageData.data[i + 3] = a;
            }
        }
        imageData = tmpImageData;   // pipe the previous ouput to the input of the following code
        tmpImageData = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);    // create new output space
        // horizontal pass
        for (let y=0; y<this._tmpCanvas.height; y++) {
            for (let x=0; x<this._tmpCanvas.width; x++) {
                let r=0, g=0, b=0, a=imageData.data[4*(this._tmpCanvas.width*y+x)+3];
                // apply kernel
                for (let kernelX=kernelStart; kernelX<=kernelEnd; kernelX++) {
                    if (x+kernelX >= this._tmpCanvas.width) break;
                    let kernelIndex = kernelX - kernelStart; // actual array index (not y-coordinate)
                    let weight = kernel[kernelIndex];
                    let ki = 4 * (this._tmpCanvas.width*y+(x+kernelX));
                    r += weight * imageData.data[ki + 0];
                    g += weight * imageData.data[ki + 1];
                    b += weight * imageData.data[ki + 2];
                }
                let i = 4*(this._tmpCanvas.width*y+x);
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
/**
 * Transforms a layer or movie using a transformation matrix. Use {@link Transform.Matrix}
 * to either A) calculate those values based on a series of translations, scalings and rotations)
 * or B) input the matrix values directly, using the optional argument in the constructor.
 */
export class Transform {
    /**
     * @param {Transform.Matrix} matrix - how to transform the target
     */
    constructor(matrix) {
        this.matrix = matrix;
        this._tmpMatrix = new Transform.Matrix();
        this._tmpCanvas = document.createElement("canvas");
        this._tmpCtx = this._tmpCanvas.getContext("2d");
    }

    apply(target, time) {
        if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
        if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
        this._tmpMatrix.data = val(this.matrix.data, time); // use data, since that's the underlying storage

        this._tmpCtx.setTransform(
            this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c,
            this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f
        );
        this._tmpCtx.drawImage(target.canvas, 0, 0);
        // Assume it was identity for now
        this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1);
        target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
        target.cctx.drawImage(this._tmpCanvas, 0, 0);
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

    /** Combines <code>this</code> with another matrix <code>other</code> */
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

    /**
     * @param {number} a - the angle or rotation in radians
     */
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

// TODO: layer masks will make much more complex masks possible
/** Preserves an ellipse of the layer and clears the rest */
export class EllipticalMask extends Base {
    constructor(x, y, radiusX, radiusY, rotation=0, startAngle=0, endAngle=2*Math.PI, anticlockwise=false) {
        super();
        this.x = x;
        this.y = y;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.rotation = rotation;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.anticlockwise = anticlockwise;
        // for saving image data before clearing
        this._tmpCanvas = document.createElement("canvas");
        this._tmpCtx = this._tmpCanvas.getContext("2d");
    }
    apply(target, time) {
        const ctx = target.cctx, canvas = target.canvas;
        const x = val(this.x, time), y = val(this.y, time),
            radiusX = val(this.radiusX, time), radiusY = val(this.radiusY, time),
            rotation = val(this.rotation, time),
            startAngle = val(this.startAngle, time), endAngle = val(this.endAngle, time),
            anticlockwise = val(this.anticlockwise, time);
        this._tmpCanvas.width = target.canvas.width;
        this._tmpCanvas.height = target.canvas.height;
        this._tmpCtx.drawImage(canvas, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();  // idk how to preserve clipping state without save/restore
        // create elliptical path and clip
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);
        ctx.closePath();
        ctx.clip();
        // render image with clipping state
        ctx.drawImage(this._tmpCanvas, 0, 0);
        ctx.restore();
    }
}
