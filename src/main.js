// TODO: change structure of framework -> mv.layer.Video & mv.effect.Base -or- mv.VideoLayer & mv.Effect

import Movie from "./movie.js";
import * as layers from "./layer.js";
import * as effects from "./effect.js";
import * as util from "./util.js";

export default {
    Movie: Movie,
    layer: layers,
    effect: effects,
    ...util
};
