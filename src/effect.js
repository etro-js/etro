// TODO: investigate why an effect might run once in the beginning even if its layer isn't at the beginning
// TODO: Add audio effect support
// TODO: move shader source to external files
import {PubSub, val, linearInterp, cosineInterp} from "./util.js";
import Movie from "./movie.js";

/**
 * Any effect that modifies the visual contents of a layer.
 *
 * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
 * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
 * different module.</em>
 */
export class Base extends PubSub {
    // subclasses must implement apply
    apply(target, reltime) {
        throw "No overriding method found or super.apply was called";
    }
}

export class Shader extends Base {
    constructor(fragmentSrc, userUniforms={}, userTextures=[]) {
        super();

        // Init WebGL
        this._canvas = document.createElement("canvas");
        const gl = this._canvas.getContext("webgl");
        if (gl === null) {
            throw "Unable to initialize WebGL. Your browser or machine may not support it.";
        }

        this._program = Shader._initShaderProgram(gl, Shader._VERTEX_SOURCE, fragmentSrc);
        this._buffers = Shader._initRectBuffers(gl);

        let maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        if (userTextures.length > maxTextures) {
            console.warn("Too many textures! Trimming...");
            while (userTextures.length > maxTextures) {
                userTextures.pop();
            }
        }
        this._userTextures = userTextures;

        this._attribLocations = {
            textureCoord: gl.getAttribLocation(this._program, "a_TextureCoord")
        };

        this._uniformLocations = {
            // modelViewMatrix: gl.getUniformLocation(this._program, "u_ModelViewMatrix"),
            source: gl.getUniformLocation(this._program, "u_Source")
        };
        // The options value can just be a string equal to the type of the variable, for syntactic sugar.
        //  If this is the case, convert it to a real options object.
        this._userUniforms = {};
        for (let name in userUniforms) {
            let val = userUniforms[name];
            this._userUniforms[name] = typeof val === "string" ? {type: val} : val;
        }
        for (let unprefixed in userUniforms) {
            // property => u_Property
            let prefixed = "u_" + unprefixed.charAt(0).toUpperCase() + (unprefixed.length > 1 ? unprefixed.slice(1) : "");
            this._uniformLocations[unprefixed] = gl.getUniformLocation(this._program, prefixed)
        }

        // this.subscribe("attach", event => {
        //     this._target = event.layer || event.movie;  // either one or the other (depending on the event caller)
        // });

        this._gl = gl;
    }

    apply(target, reltime) {
        const gl = this._gl;

        if (this._canvas.width !== target.canvas.width || this._canvas.height !== target.canvas.height) {   // (optimization)
            this._canvas.width = target.canvas.width;
            this._canvas.height = target.canvas.height;

            gl.viewport(0, 0, target.canvas.width, target.canvas.height);
        }

        gl.clearColor(0, 0, 0, 0);  // clear to transparency; TODO: test
        // gl.clearDepth(1.0);         // clear everything
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);        // gl.depthFunc(gl.LEQUAL);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Tell WebGL how to pull out the positions from buffer
        {
            const numComponents = 2;
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                      // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.position);
            gl.vertexAttribPointer(
                this._attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                this._attribLocations.vertexPosition);
        }

        // tell webgl how to pull out the texture coordinates from buffer
        {
            const numComponents = 2; // every coordinate composed of 2 values (uv)
            const type = gl.FLOAT; // the data in the buffer is 32 bit float
            const normalize = false; // don't normalize
            const stride = 0; // how many bytes to get from one set to the next
            const offset = 0; // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.textureCoord);
            gl.vertexAttribPointer(this._attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
            gl.enableVertexAttribArray(this._attribLocations.textureCoord);
        }

        // TODO: figure out which properties should be private / public

        this._inputTexture = Shader._loadTexture(gl, target.canvas);
        // clear the target, in case the effect outputs transparent pixels
        target.cctx.clearRect(0, 0, target.canvas.width, target.canvas.height);

        // Tell WebGL we want to affect texture unit 0
        gl.activeTexture(gl.TEXTURE0);
        // Bind the texture to texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, this._inputTexture);

        let i = 0;
        for (let name in this._userTextures) {
            let options = this._userTextures[name];
            let source = this[name];
            let preparedTex = Shader._loadTexture(val(source, this, reltime), options); // do it every frame to keep updated (I think you need to)
            gl.activeTexture(gl.TEXTURE0 + i);  // use the fact that TEXTURE0, TEXTURE1, ... are continuous
            gl.bindTexture(options.target, preparedTex)
        }

        gl.useProgram(this._program);

        // Set the shader uniforms

        // Tell the shader we bound the texture to texture unit 0
        gl.uniform1i(this._uniformLocations.source, 0);

        for (let unprefixed in this._userUniforms) {
            let options = this._userUniforms[unprefixed];
            let value = this[unprefixed];
            let preparedValue = Shader._prepareValue(val(value, this, reltime), options.type, options);
            let location = this._uniformLocations[unprefixed];
            gl["uniform" + options.type](location, preparedValue);    // haHA JavaScript
        }

        {
            const offset = 0;
            const vertexCount = 4;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }

        /*let ctx = target.cctx || target._movie.cctx,    // always render to movie canvas
            movie = target instanceof Movie ? target : target._movie,
            x = val(target.x) || 0,  // layer offset
            y = val(target.y) || 0,  // layer offset
            width = val(target.width || movie.width),
            height = val(target.height || movie.height);

        // copy internal image state onto movie
        ctx.drawImage(this._canvas, x, y, width, height);*/

        // copy internal image state onto target
        target.cctx.drawImage(this._canvas, 0, 0);
    }
}
Shader._initRectBuffers = gl => {
    const position = [
        // the screen/canvas (output)
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0
    ];
    const textureCoord = [
        // the texture/canvas (input)
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
    ];

    return {
        position: Shader._initBuffer(gl, position),
        textureCoord: Shader._initBuffer(gl, textureCoord)
    };
}
/**
 * Creates the quad covering the screen
 */
Shader._initBuffer = (gl, data) => {
    const buffer = gl.createBuffer();

    // Select the buffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    return buffer;
}
/**
 * Creates a webgl texture from the source.
 * @param {object} [options] - optional WebGL config for texture
 * @param {number} [options.target=gl.TEXTURE_2D]
 * @param {number} [options.level=0]
 * @param {number} [options.internalFormat=gl.RGBA]
 * @param {number} [options.srcFormat=gl.RGBA]
 * @param {number} [options.srcType=gl.UNSIGNED_BYTE]
 * @param {number} [options.minFilter=gl.LINEAR]
 * @param {number} [options.magFilter=gl.LINEAR]
 */
Shader._loadTexture = (gl, canvas, options={}) => {
    let target = options.target ? options.target : gl.TEXTURE_2D;
    let level = options.level || 0;
    let internalFormat = options.internalFormat ? options.internalFormat : gl.RGBA;
    let srcFormat = options.srcFormat ? options.srcFormat : gl.RGBA;
    let srcType = options.srcType ? options.srcType : gl.UNSIGNED_BYTE;
    let minFilter = options.minFilter ? options.minFilter : gl.LINEAR,
        magFilter = options.magFilter ? options.magFilter : gl.LINEAR;
    // TODO: figure out how wrap-s and wrap-t interact with mipmaps (for legacy support)
    // let wrapS = options.wrapS ? options.wrapS : gl.CLAMP_TO_EDGE,
    //     wrapT = options.wrapT ? options.wrapT : gl.CLAMP_TO_EDGE;

    const tex = gl.createTexture();
    gl.bindTexture(target, tex);

    // TODO: figure out how this works with layer width/height

    // set to `canvas`
    gl.texImage2D(target, level, internalFormat, srcFormat, srcType, canvas);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(canvas.width) && isPowerOf2(canvas.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(target);
    } else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
    }

    return tex;
};
const isPowerOf2 = value => (value && (value - 1)) === 0;
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
Shader._initShaderProgram = (gl, vertexSrc, fragmentSrc) => {
    const vertexShader = Shader._loadShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = Shader._loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // check program creation status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.warn("Unable to link shader program: " + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
};
Shader._loadShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // check compile status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("An error occured compiling shader: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
};
/**
 * Converts a value of a standard type for javascript to a standard type for GLSL
 * @param value - the raw value to prepare
 * @param outputType - the WebGL type of |value|; example: <code>1f</code> for a float
 * @param {object} [options] - Optional config
 */
Shader._prepareValue = (value, outputType, options={}) => {
    let def = options.defaultFloatComponent || 0;
    if (outputType === "3fv") {
        if (Array.isArray(value) && (value.length === 3 || value.length === 4))  // allow 4-component vectors; TODO: why?
            return value;
        if (typeof value === "object")  // kind of loose so this can be changed if needed
            return [
                value.r != undefined ? value.r : def,
                value.g != undefined ? value.g : def,
                value.b != undefined ? value.b : def
            ];

        throw `Invalid type: ${outputType} or value: ${value}`;
    }

    if (outputType === "4fv") {
        if (Array.isArray(value) && value.length === 4)
            return value;
        if (typeof value === "object")  // kind of loose so this can be changed if needed
            return [
                value.r != undefined ? value.r : def,
                value.g != undefined ? value.g : def,
                value.b != undefined ? value.b : def,
                value.a != undefined ? value.a : def
            ];

        throw `Invalid type: ${outputType} or value: ${value}`;
    }

    return value;
};
Shader._VERTEX_SOURCE = `
    attribute vec4 a_VertexPosition;
    attribute vec2 a_TextureCoord;

    varying highp vec2 v_TextureCoord;

    void main() {
        // no need for projection or model-view matrices, since we're just rendering a rectangle
        // that fills the screen (see position values)
        gl_Position = a_VertexPosition;
        v_TextureCoord = a_TextureCoord;
    }
`;

    }
}

/** Changes the contrast */
export class Contrast extends Base {
    constructor(contrast=1.0) {
        super();
        this.contrast = contrast;
    }
    apply(target, reltime) {
        const contrast = val(this.contrast, target, reltime);
        mapPixels((data, start) => {
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
    apply(target, reltime) {
        const factors = val(this.factors, target, reltime);
        if (factors.a > 1 || (factors.r < 0 || factors.g < 0 || factors.b < 0 || factors.a < 0))
            throw "Invalid channel factors";
        mapPixels((data, start) => {
            data[start+0] *= factors.r || 1;    // do defaults here to account for keyframes
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
    apply(target, reltime) {
        const targetColor = val(this.targetColor, target, reltime), threshold = val(this.threshold, target, reltime),
            interpolate = val(this.interpolate, target, reltime),
            smoothingSharpness = val(this.smoothingSharpness, target, reltime);
        mapPixels((data, start) => {
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
        super();
        this.radius = radius;
        // TODO: get rid of tmpCanvas and just take advantage of image data's immutability
        this._tmpCanvas = document.createElement("canvas");
        this._tmpCtx = this._tmpCanvas.getContext("2d");
    }
    apply(target, reltime) {
        if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
        if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
        const radius = val(this.radius, target, reltime);
        if (radius % 2 !== 1 || radius <= 0) throw "Radius should be an odd natural number";

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

/** Makes the target look pixelated (have large "pixels") */
export class Pixelate extends Base {
    /**
     * @param {boolean} [options.ignorePixelHeight=false] - whether to make pixels square and use pixelWidth
     *  as the dimension
     */
    constructor(pixelWidth=1, pixelHeight=1, options={}) {
        super();
        this.pixelWidth = pixelWidth;
        this.pixelHeight = pixelHeight;
        this.ignorePixelHeight = options.ignorePixelHeight || false;

        // not needed because you can read and write to the same canvas with this effect, I'm pretty sure
        // this._tmpCanvas = document.createElement("canvas");
        // this._tmpCtx = this._tmpCanvas.getContext("2d");
    }

    apply(target, reltime) {
        const pw = val(this.pixelWidth, target, reltime),
            ph = !val(this.ignorePixelHeight, target, reltime) ? val(this.pixelHeight, target, reltime) : pw;
        // if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
        // if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;

        if (pw % 1 !== 0 || ph % 1 !== 0 || pw < 0 || ph < 0)
            throw "Pixel dimensions must be whole numbers";

        const imageData = target.cctx.getImageData(0, 0, target.canvas.width, target.canvas.height);

        // use the average of each small pixel in the new pixel for the value of the new pixel
        for (let y=0; y<target.canvas.height; y += ph) {
            for (let x=0; x<target.canvas.width; x += pw) {
                let r=0, g=0, b=0, count=0;
                // for (let sy=0; sy<ph; sy++) {
                //     for (let sx=0; sx<pw; sx++) {
                //         let i = 4*(target.canvas.width*(y+sy)+(x+sx));
                //         r += imageData.data[i+0];
                //         g += imageData.data[i+1];
                //         b += imageData.data[i+2];
                //         count++;
                //     }
                // }
                // r /= count;
                // g /= count;
                // b /= count;
                let i = 4*(target.canvas.width*(y+Math.floor(ph/2))+(x+Math.floor(pw/2)));
                r = imageData[i+0];
                g = imageData[i+1];
                b = imageData[i+2];

                // apply average color
                // this._tmpCtx.fillColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
                // this._tmpCtx.fillRect(x, y, pw, ph); // fill new (large) pixel
                target.cctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
                target.cctx.fillRect(x, y, pw, ph); // fill new (large) pixel
            }
        }
    }
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

    apply(target, reltime) {
        if (target.canvas.width !== this._tmpCanvas.width) this._tmpCanvas.width = target.canvas.width;
        if (target.canvas.height !== this._tmpCanvas.height) this._tmpCanvas.height = target.canvas.height;
        this._tmpMatrix.data = val(this.matrix.data, target, reltime); // use data, since that's the underlying storage

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
            1, 0, x,
            0, 1, y,
            0, 0, 1
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
    apply(target, reltime) {
        const ctx = target.cctx, canvas = target.canvas;
        const x = val(this.x, target, reltime), y = val(this.y, target, reltime),
            radiusX = val(this.radiusX, target, reltime), radiusY = val(this.radiusY, target, reltime),
            rotation = val(this.rotation, target, reltime),
            startAngle = val(this.startAngle, target, reltime), endAngle = val(this.endAngle, target, reltime),
            anticlockwise = val(this.anticlockwise, target, reltime);
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
