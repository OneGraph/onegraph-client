const build = require('../../rollup');
const path = require('path');

const moduleName = path.basename(__dirname);

build(moduleName);
