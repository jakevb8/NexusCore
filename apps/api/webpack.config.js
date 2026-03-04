const { compilerOptions } = require('./tsconfig.json')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = (options, webpack) => {
  return {
    ...options,
    // Bundle all @nexus-core/* packages inline — they are TypeScript source
    // files that Node cannot require() directly at runtime.
    externals: [
      (ctx, callback) => {
        const { request } = ctx
        // Treat @nexus-core/* as internal (bundle them)
        if (request && request.startsWith('@nexus-core/')) {
          return callback()
        }
        // Everything else is external (loaded from node_modules at runtime)
        if (request && !request.startsWith('.') && !request.startsWith('/')) {
          return callback(null, `commonjs ${request}`)
        }
        callback()
      },
    ],
    resolve: {
      ...options.resolve,
      plugins: [
        new TsconfigPathsPlugin({
          configFile: './tsconfig.json',
        }),
      ],
    },
  }
}
