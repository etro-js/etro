import { Visual } from '../layer/index';
import { Movie } from '../movie';
import { Base } from './base';
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
export interface ShaderOptions {
    fragmentSource?: string;
    uniforms?: Record<string, (UniformOptions | string)>;
    textures?: Record<string, TextureOptions>;
    sourceTextureOptions?: TextureOptions;
}
/**
 * A hardware-accelerated pixel mapping using WebGL
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
     * @param fragmentSrc
     * @param [userUniforms={}] - object mapping uniform id to an
     * options object or a string (if you only need to provide the uniforms'
     * type)
     * @param [userTextures=[]]
     * @param [sourceTextureOptions={}]
     */
    constructor(options?: ShaderOptions);
    private _initGl;
    private _initTextures;
    private _initAttribs;
    private _initUniforms;
    apply(target: Movie | Visual): void;
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
     * @param outputType - the WebGL type of |value|; example:
     * <code>1f</code> for a float
     * @param reltime - current time, relative to the target
     * @param [options] - Optional config
     */
    private _prepareValue;
    private static _initRectBuffers;
    /**
     * Creates the quad covering the screen
     */
    private static _initBuffer;
    /**
     * Creates a webgl texture from the source.
     * @param [options] - optional WebGL config for texture
     * @param [options.target=gl.TEXTURE_2D]
     * @param [options.level=0]
     * @param [options.internalFormat=gl.RGBA]
     * @param [options.srcFormat=gl.RGBA]
     * @param [options.srcType=gl.UNSIGNED_BYTE]
     * @param [options.wrapS=gl.CLAMP_TO_EDGE]
     * @param [options.wrapT=gl.CLAMP_TO_EDGE]
     * @param [options.minFilter=gl.LINEAR]
     * @param [options.magFilter=gl.LINEAR]
     */
    private static _loadTexture;
    private static _initShaderProgram;
    private static _loadShader;
}
