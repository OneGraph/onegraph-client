import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/OneGraphApolloClient.js',
  output: {
    file: 'dist/bundle.umd.js',
    format: 'umd',
    name: 'OneGraphApolloClient',
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
  external: ['apollo-cache-inmemory', 'apollo-client', 'apollo-link-http'],
};
