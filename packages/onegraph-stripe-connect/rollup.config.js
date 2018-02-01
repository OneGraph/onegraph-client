import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/OneGraphStripeConnect.js',
  output: {
    file: 'dist/bundle.umd.js',
    format: 'umd',
    name: 'onegraph-stripe-connect',
    exports: 'named',
    sourcemap: true,
  },
  globals: {
    'onegraph-auth': 'OneGraphAuth',
    'react': 'React',
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
    postcss({
      plugins: [],
    }),
  ],
  external: ['react'],
};
