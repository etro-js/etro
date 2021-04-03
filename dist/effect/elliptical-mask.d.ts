import Movie from '../movie';
import { Dynamic } from '../util';
import BaseEffect from './base';
import { Visual } from '../layer/index';
/**
 * Preserves an ellipse of the layer and clears the rest
 */
declare class EllipticalMask extends BaseEffect {
    x: Dynamic<number>;
    y: Dynamic<number>;
    radiusX: Dynamic<number>;
    radiusY: Dynamic<number>;
    rotation: Dynamic<number>;
    startAngle: Dynamic<number>;
    endAngle: Dynamic<number>;
    anticlockwise: Dynamic<boolean>;
    private _tmpCanvas;
    private _tmpCtx;
    constructor(x: Dynamic<number>, y: Dynamic<number>, radiusX: Dynamic<number>, radiusY: Dynamic<number>, rotation?: Dynamic<number>, startAngle?: Dynamic<number>, endAngle?: Dynamic<number>, anticlockwise?: Dynamic<boolean>);
    apply(target: Movie | Visual, reltime: number): void;
}
export default EllipticalMask;
