// import uglify from "rollup-plugin-uglify-es";
import cleaner from 'rollup-plugin-cleaner'
import resolve from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'

export default [
  // iife bundle
  {
    input: 'src/index.ts',
    output: { file: 'dist/etro-iife.js', format: 'iife', name: 'etro' },
    plugins: [
      cleaner({
        targets: ['dist']
      }),
      typescript(),
      resolve()
    ]
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/etro-cjs.js', format: 'cjs' },
    plugins: [
      typescript(),
      resolve()
    ]
  }
  // // es6 module bundle
  // {
  //     input: "src/index.js",
  //     output: { file: "dist/etro-esm.js", format: "esm", name: "etro" }
  // },

  /*      ERRORS FOR SOME REASON
    // iife bundle (minified)
    {
        input: 'src/index.js',
        output: { file: 'dist/etro-iife.min.js', format: 'iife', name: 'mv' },
        plugins: [ uglify() ]
    },
    // es6 module bundle (minified)
    {
        input: 'src/index.js',
        output: { file: 'dist/etro-esm.min.js', format: 'esm', name: 'mv' },
        plugins: [ uglify() ]
    }
    */
]
