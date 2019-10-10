// import uglify from "rollup-plugin-uglify-es";

export default [
    // iife bundle
    {
        input: "src/index.js",
        output: { file: "dist/vidar.js", format: "iife", name: "vd" }
    },
    // // es6 module bundle
    // {
    //     input: "src/index.js",
    //     output: { file: "dist/vidar-esm.js", format: "esm", name: "vd" }
    // },

    /*      ERRORS FOR SOME REASON
    // iife bundle (minified)
    {
        input: 'src/index.js',
        output: { file: 'dist/vidar-iife.min.js', format: 'iife', name: 'mv' },
        plugins: [ uglify() ]
    },
    // es6 module bundle (minified)
    {
        input: 'src/index.js',
        output: { file: 'dist/vidar-esm.min.js', format: 'esm', name: 'mv' },
        plugins: [ uglify() ]
    }
    */
];
