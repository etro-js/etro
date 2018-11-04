/* The entry point */
// TODO: investigate possibility of changing movie (canvas) width/height after layers added

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
