import { Movie } from '../movie';
import { Dynamic } from '../util';
import { Visual } from './visual';
import { Visual as VisualLayer } from '../layer/index';
export declare class EllipticalMaskOptions {
    x: Dynamic<number>;
    y: Dynamic<number>;
    radiusX: Dynamic<number>;
    radiusY: Dynamic<number>;
    rotation?: Dynamic<number>;
    startAngle?: Dynamic<number>;
    endAngle?: Dynamic<number>;
    anticlockwise?: Dynamic<boolean>;
}
/**
 * Preserves an ellipse of the layer and clears the rest
 */
export declare class EllipticalMask extends Visual {
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
    constructor(options: EllipticalMaskOptions);
    apply(target: Movie | VisualLayer, reltime: number): void;
}
