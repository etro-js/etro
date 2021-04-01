import { Visual } from '../layer/index';
import Movie from '../movie';
import Base from './base';
export interface UniformOptions {
    type?: string;
    defaultFloatComponent?: number;
}
export interface TextureOptions {
    createUniform?: boolean;
    target?: any;
    level?: number;
    internalFormat?: any;
    srcFormat?: any;
    srcType?: any;
    wrapS?: any;
    wrapT?: any;
    minFilter?: any;
    magFilter?: any;
}
/**
 * A hardware-accelerated pixel mapping
 */
export declare class Shader extends Base {
    /**
     * WebGL texture units consumed by {@link Shader}
     */
    static INTERNAL_TEXTURE_UNITS: number;
    private static _DEFAULT_TEXTURE_OPTIONS;
    private static _VERTEX_SOURCE;
    private static _IDENTITY_FRAGMENT_SOURCE;
    private _program;
    private _buffers;
    private _canvas;
    private _gl;
    private _uniformLocations;
    private _attribLocations;
    private _userUniforms;
    private _userTextures;
    private _sourceTextureOptions;
    private _inputTexture;
    /**
     * @param {string} fragmentSrc
     * @param {object} [userUniforms={}] - object mapping uniform id to an
     * options object or a string (if you only need to provide the uniforms'
     * type)
     * @param {object[]} [userTextures=[]]
     * @param {object} [sourceTextureOptions={}]
     */
    constructor(fragmentSrc?: string, userUniforms?: Record<string, (UniformOptions | string)>, userTextures?: Record<string, TextureOptions>, sourceTextureOptions?: TextureOptions);
    private _initGl;
    private _initTextures;
    private _initAttribs;
    private _initUniforms;
    apply(target: Movie | Visual, reltime: number): void;
    private _checkDimensions;
    private _refreshGl;
    private _enablePositionAttrib;
    private _enableTexCoordAttrib;
    private _prepareTextures;
    private _prepareUniforms;
    private _draw;
    /**
     * Converts a value of a standard type for javascript to a standard type for
     * GLSL
     * @param value - the raw value to prepare
     * @param {string} outputType - the WebGL type of |value|; example:
     * <code>1f</code> for a float
     * @param {number} reltime - current time, relative to the target
     * @param {object} [options] - Optional config
     */
    private _prepareValue;
    private static _initRectBuffers;
    /**
     * Creates the quad covering the screen
     */
    private static _initBuffer;
    /**
     * Creates a webgl texture from the source.
     * @param {object} [options] - optional WebGL config for texture
     * @param {number} [options.target=gl.TEXTURE_2D]
     * @param {number} [options.level=0]
     * @param {number} [options.internalFormat=gl.RGBA]
     * @param {number} [options.srcFormat=gl.RGBA]
     * @param {number} [options.srcType=gl.UNSIGNED_BYTE]
     * @param {number} [options.wrapS=gl.CLAMP_TO_EDGE]
     * @param {number} [options.wrapT=gl.CLAMP_TO_EDGE]
     * @param {number} [options.minFilter=gl.LINEAR]
     * @param {number} [options.magFilter=gl.LINEAR]
     */
    private static _loadTexture;
    private static _initShaderProgram;
    private static _loadShader;
}
