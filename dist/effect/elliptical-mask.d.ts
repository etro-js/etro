import Movie from '../movie';
import { Property } from '../util';
import BaseEffect from './base';
import { Visual } from '../layer/index';
/**
 * Preserves an ellipse of the layer and clears the rest
 */
declare class EllipticalMask extends BaseEffect {
    x: Property<number>;
    y: Property<number>;
    radiusX: Property<number>;
    radiusY: Property<number>;
    rotation: Property<number>;
    startAngle: Property<number>;
    endAngle: Property<number>;
    anticlockwise: Property<boolean>;
    private _tmpCanvas;
    private _tmpCtx;
    constructor(x: Property<number>, y: Property<number>, radiusX: Property<number>, radiusY: Property<number>, rotation?: Property<number>, startAngle?: Property<number>, endAngle?: Property<number>, anticlockwise?: Property<boolean>);
    apply(target: Movie | Visual, reltime: number): void;
}
export default EllipticalMask;
