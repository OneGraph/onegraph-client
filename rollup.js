const babel = require('rollup-plugin-babel');
const postcss = require('rollup-plugin-postcss');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

const rollup = require('rollup');

function createBundle() {
  return rollup.rollup({
    input: 'src/index.js',
    external: ['react'],
    plugins: [
      babel({
        exclude: 'node_modules/**',
        presets: ['react', 'stage-0', 'flow'],
      }),
      commonjs(),
      resolve(),

      postcss({
        plugins: [],
      }),
    ],
  });
}

async function buildForFormat(bundle, moduleName, format) {
  await bundle.write({
    format,
    file: `dist/bundle.${format}.js`,
    name: moduleName,
    exports: 'named',
    sourcemap: true,
    globals: {react: 'React'},
  });
}

module.exports = async function build(moduleName) {
  try {
    const bundle = await createBundle();
    await buildForFormat(bundle, moduleName, 'umd');
    await buildForFormat(bundle, moduleName, 'es');
    await buildForFormat(bundle, moduleName, 'cjs');

    console.log(`finished building ${moduleName}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
