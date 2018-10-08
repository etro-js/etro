import Movie from "./movie.js";
import * as layer from "./layer.js";
import Effect from "./effect.js";
import * as util from "./util.js";
import * as effects from "../plugins/effects.js";

export default {
    Movie: Movie,
    ...layer,
    Effect: Effect,
    ...util,
    effects: effects    // add effects as as a property of export
};
