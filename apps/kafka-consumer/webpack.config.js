const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = (options, webpack) => {
  return {
    ...options,
    externals: [
      (ctx, callback) => {
        const { request } = ctx
        // Everything that isn't a relative/absolute path is external
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
