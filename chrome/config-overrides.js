// Adapted from the explanation here:
// https://medium.com/swlh/bootstrapping-complex-chrome-firefox-edge-extensions-with-create-react-app-667be8df35d7

const paths = require('react-scripts/config/paths');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Export override function(s) via object
module.exports = {
  webpack: override,
  // You may also override the Jest config (used for tests) by adding property with 'jest' name below. See react-app-rewired library's docs for details
};

// Function to override the CRA webpack config
function override(config, env) {
  // Replace single entry point in the config with multiple ones
  // Note: you may remove any property below except "popup" to exclude respective entry point from compilation
  config.entry = {
    // popup: paths.appIndexJs,
    popup: paths.appSrc + '/popup/popup.js',
    content: paths.appSrc + '/content/content.js',
    inject: paths.appSrc + '/content/inject.js',
    analytics: paths.appSrc + '/analytics/analytics.js',
    settings: paths.appSrc + '/settings/settings.js',
  };
  // Change output filename template to get rid of hash there
  config.output.filename = 'static/js/[name].js';
  // Disable built-in SplitChunksPlugin
  config.optimization.splitChunks = {
    cacheGroups: {default: false}
  };
  // Disable runtime chunk addition for each entry point
  config.optimization.runtimeChunk = false;

  // Shared minify options to be used in HtmlWebpackPlugin constructor
  const minifyOpts = {
    removeComments: true,
    collapseWhitespace: true,
    removeRedundantAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeStyleLinkTypeAttributes: true,
    keepClosingSlash: true,
    minifyJS: true,
    minifyCSS: true,
    minifyURLs: true,
  };
  const isEnvProduction = env === 'production';
  
  // Custom HtmlWebpackPlugin instance for index (popup) page
  const popupHtmlPlugin = new HtmlWebpackPlugin({
    inject: true,
    chunks: ['popup'],
    template: paths.appPublic + '/popup.html',
    filename: 'popup.html',
    minify: isEnvProduction && minifyOpts,
  });
  // Replace origin HtmlWebpackPlugin instance in config.plugins with the above one
  config.plugins = replacePlugin(config.plugins,
    (name) => /HtmlWebpackPlugin/i.test(name), popupHtmlPlugin
  );

  // Extra HtmlWebpackPlugin instance for analytics page
  const analyticsHtmlPlugin = new HtmlWebpackPlugin({
    inject: true,
    chunks: ['analytics'],
    template: paths.appPublic + '/analytics.html',
    filename: 'analytics.html',
    minify: isEnvProduction && minifyOpts,
  });
  // Add the above HtmlWebpackPlugin instance into config.plugins
  // Note: you may remove/comment the next line if you don't need an options page
  config.plugins.push(analyticsHtmlPlugin);

  // Extra HtmlWebpackPlugin instance for settings page
  const settingsHtmlPlugin = new HtmlWebpackPlugin({
    inject: true,
    chunks: ['settings'],
    template: paths.appPublic + '/settings.html',
    filename: 'settings.html',
    minify: isEnvProduction && minifyOpts,
  });
  // Add the above HtmlWebpackPlugin instance into config.plugins
  // Note: you may remove/comment the next line if you don't need an options page
  config.plugins.push(settingsHtmlPlugin);

  // Custom ManifestPlugin instance to cast asset-manifest.json back to old plain format
  const manifestPlugin = new (ManifestPlugin.WebpackManifestPlugin ||
    ManifestPlugin)({
    fileName: 'asset-manifest.json',
  });
  // Replace origin ManifestPlugin instance in config.plugins with the above one
  config.plugins = replacePlugin(config.plugins,
    (name) => /ManifestPlugin/i.test(name), manifestPlugin
  );

  // Custom MiniCssExtractPlugin instance to get rid of hash in filename template
  const miniCssExtractPlugin = new MiniCssExtractPlugin({
    filename: 'static/css/[name].css'
  });
  // Replace origin MiniCssExtractPlugin instance in config.plugins with the above one
  config.plugins = replacePlugin(config.plugins,
    (name) => /MiniCssExtractPlugin/i.test(name), miniCssExtractPlugin
  );

  // Remove GenerateSW plugin from config.plugins to disable service worker generation
  config.plugins = replacePlugin(config.plugins,
    (name) => /GenerateSW/i.test(name)
  );

  // Copy the WebExtension polyfill
  // https://github.com/mozilla/webextension-polyfill/#usage-with-webpack-without-bundling
  const polyfillPlugin = new CopyWebpackPlugin({
    patterns: [{
      from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
      to: 'static/js/',
    }]
  });
  config.plugins.push(polyfillPlugin);

  return config;
}

// Utility function to replace/remove specific plugin in a webpack config
function replacePlugin(plugins, nameMatcher, newPlugin) {
  const i = plugins.findIndex((plugin) => {
    return plugin.constructor && plugin.constructor.name &&
      nameMatcher(plugin.constructor.name);
  });
  return i > -1 ?
    plugins.slice(0, i).concat(newPlugin || []).concat(plugins.slice(i + 1)) :
    plugins;
}
