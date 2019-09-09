import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/auth.js',
  output: {
    file: 'dist/bundle.umd.js',
    format: 'umd',
    name: 'onegraph-auth',
    exports: 'named',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
