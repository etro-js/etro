import {eslint} from 'rollup-plugin-eslint';    // it's weird how they exported it this way
import uglify from 'rollup-plugin-uglify-es';

export default [
    // iife bundle
    {
        input: 'src/index.js',
        output: { file: 'dist/movie-iife.js', format: 'iife', name: 'mv' },
        plugins: [ eslint() ]
    },
    // es6 module bundle
    {
        input: 'src/index.js',
        output: { file: 'dist/movie-esm.js', format: 'esm', name: 'mv' },
        plugins: [ eslint() ]
    },

    /*      ERRORS FOR SOME REASON
    // iife bundle (minified)
    {
        input: 'src/index.js',
        output: { file: 'dist/movie-iife.min.js', format: 'iife', name: 'mv' },
        plugins: [ uglify() ]
    },
    // es6 module bundle (minified)
    {
        input: 'src/index.js',
        output: { file: 'dist/movie-esm.min.js', format: 'esm', name: 'mv' },
        plugins: [ uglify() ]
    }
    */
];
