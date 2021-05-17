import { Base } from './base';
import { Visual as VisualLayer } from '../layer';
import { Movie } from '../movie';
import { Color, Dynamic } from '../util';
export interface FadeInOptions {
    duration: number;
    color: Color;
}
export declare class FadeIn extends Base {
    color: Dynamic<Color>;
    readonly duration: number;
    private _cacheCtx;
    private _effectOpacity;
    constructor(options: FadeInOptions);
    apply(target: VisualLayer | Movie): void;
}
