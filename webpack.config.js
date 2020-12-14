var path = require('path');
var TerserPlugin = require('terser-webpack-plugin');
var entryPath = './src/index.js';

module.exports = {
  target: 'web',
  mode: 'production',
  entry: {
    'orxe': entryPath,
    'orxe.min': entryPath
  },
  externals: {
    'node-forge': 'node-forge'
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: '[name].js',
    library: 'orxe',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|node/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [
              [
                '@babel/preset-env',
                {
                  'modules': 'umd'
                }
              ]
            ]
          }
        }
      }
    ]
  },
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({
        include: /\.min\.js$/
      })
    ],
  },
  watch: false
};
