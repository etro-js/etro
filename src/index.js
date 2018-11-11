/* The entry point */
// TODO: investigate possibility of changing movie (canvas) width/height after layers added
// TODO: create built-in audio gain node for volume control in movie and/or layer
// TODO: figure out InvalidStateError in beginning only when reloaded

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
