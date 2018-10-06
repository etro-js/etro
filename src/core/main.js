import movie from "./movie.js";
import * as layer from "./layer.js";
import effect from "./effect.js";
import * as util from "./util.js";
import * as effects from "../plugins/effects.js";

export default {
    Movie: movie,
    ...layer,
    Effect: effect,
    ...util,
    effects: effects    // add effects as as a property of export
};
