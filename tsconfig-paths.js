const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

const { baseUrl, paths } = tsConfig.compilerOptions;

for (const path in paths) {
  paths[path] = paths[path].map((path) => path.replace('src', 'dist'));
}

tsConfigPaths.register({ baseUrl, paths });
