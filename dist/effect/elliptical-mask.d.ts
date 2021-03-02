import Movie from '../movie';
import BaseEffect from './base';
import { Visual } from '../layer/index';
/**
 * Preserves an ellipse of the layer and clears the rest
 */
declare class EllipticalMask extends BaseEffect {
    x: number;
    y: number;
    radiusX: number;
    radiusY: number;
    rotation: number;
    startAngle: number;
    endAngle: number;
    anticlockwise: boolean;
    private _tmpCanvas;
    private _tmpCtx;
    constructor(x: number, y: number, radiusX: number, radiusY: number, rotation?: number, startAngle?: number, endAngle?: number, anticlockwise?: boolean);
    apply(target: Movie | Visual, reltime: number): void;
}
export default EllipticalMask;
