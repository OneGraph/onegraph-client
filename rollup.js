const babel = require('rollup-plugin-babel');
const postcss = require('rollup-plugin-postcss');
const resolve = require('rollup-plugin-node-resolve');
const rollup = require('rollup');

async function buildForFormat(moduleName, format) {
  const bundle = await rollup.rollup({
    input: 'src/index.js',
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**',
      }),
      postcss({
        plugins: [],
      }),
    ],
  });

  await bundle.write({
    format,
    file: `dist/bundle.${format}.js`,
    name: moduleName,
    exports: 'named',
    sourcemap: true,
  });
}

module.exports = function build(moduleName) {
  Promise.all([
    buildForFormat(moduleName, 'umd'),
    buildForFormat(moduleName, 'es'),
  ])
    .then(console.log(`finished building ${moduleName}`))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
};
