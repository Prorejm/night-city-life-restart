const path = require('path');
module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'view'),
    filename: 'bundle.js'
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', { useBuiltIns: 'usage', corejs: 3 }]]
        }
      }
    }]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'view')
    },
    port: 3000,
    hot: true
  }
};
