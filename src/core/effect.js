export default class Effect {
    // subclasses must implement apply
    apply(renderer) {
        throw "No overriding method found or super.apply was called";
    }
}
