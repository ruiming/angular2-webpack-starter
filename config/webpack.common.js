const webpack = require('webpack');
const helpers = require('./helpers');

// problem with copy-webpack-plugin
// 导出构建的 bundle 资源与原模块的映射用
// https://github.com/kossnocorp/assets-webpack-plugin
const AssetsPlugin = require('assets-webpack-plugin');
// 匹配resourceRegExp，替换为newResource
const NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
// 替换上下文的插件
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
// 合并公共代码
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
// 拷贝资源
const CopyWebpackPlugin = require('copy-webpack-plugin');
// TS类型检查
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
// 根据 maps 生成 HTML tags 用
const HtmlElementsPlugin = require('./html-elements-plugin');
// 动态生成 HTML 并注入 CSS, JS, Manifest, Favicon 等等
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 配置 loader 选项
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
// 增强 html-webpack-plugin 插件, 配置 inline, async, defer 等
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');

/*
 * Webpack Constants Webpack 变量
 * HMR: hot module replacement
 * AOT: Ahead Of Time ( Angular2 预编译 )
 */
const HMR = helpers.hasProcessFlag('hot');  // 运行参数有 hot 标志
const AOT = helpers.hasNpmFlag('aot');      // NPM 运行参数包含 aot
const METADATA = {                          // 定义 METADATA
  title: 'Angular2 Webpack Starter by @gdi2290 from @AngularClass',
  baseUrl: '/',
  isDevServer: helpers.isWebpackDevServer()
};

module.exports = function (options) {
  isProd = options.env === 'production';
  return {
    entry: {
      'polyfills': './src/polyfills.browser.ts',
      'main':      AOT ? './src/main.browser.aot.ts' :
                  './src/main.browser.ts'
    },
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      modules: [helpers.root('src'), helpers.root('node_modules')],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            '@angularclass/hmr-loader?pretty=' + !isProd + '&prod=' + isProd,
            'awesome-typescript-loader?{configFileName: "tsconfig.webpack.json"}',
            'angular2-template-loader',
            'angular-router-loader?loader=system&genDir=compiled/src/app&aot=' + AOT
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        {
          test: /\.json$/,
          use: 'json-loader'
        },
        {
          test: /\.scss$/,
          use: ['raw-loader', 'sass-loader']
        },
        {
          test: /\.css$/,
          use: ['to-string-loader', 'css-loader']
        },
        {
          test: /\.html$/,
          use: 'raw-loader',
          exclude: [helpers.root('src/index.html')]
        },
        {
          test: /\.(jpg|png|gif)$/,
          use: 'file-loader'
        },
      ],
    },
    plugins: [
      // 导出 Webpack 构建后的文件名的映射关系
      new AssetsPlugin({
        path: helpers.root('dist'),
        filename: 'webpack-assets.json',
        prettyPrint: true
      }),
      /*
       * Plugin: ForkCheckerPlugin
       * Description: Do type checking in a separate process, so webpack don't need to wait.
       *
       * See: https://github.com/s-panferov/awesome-typescript-loader#forkchecker-boolean-defaultfalse
       */
      // 类型检查
      new CheckerPlugin(),
      /*
       * Plugin: CommonsChunkPlugin
       * Description: Shares common code between the pages.
       * It identifies common modules and put them into a commons chunk.
       *
       * See: https://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
       * See: https://github.com/webpack/docs/wiki/optimization#multi-page-app
       */
      new CommonsChunkPlugin({
        name: 'polyfills',
        chunks: ['polyfills']
      }),
      // This enables tree shaking of the vendor modules
      new CommonsChunkPlugin({
        name: 'vendor',
        chunks: ['main'],
        // minChunks : 一个文件至少被 require minChunks 次时才放入 CommonsChunkPlugin 里
        minChunks: module => /node_modules\//.test(module.resource)
      }),
      // Specify the correct order the scripts will be injected in
      // [A, B] A 与 B 共有的模块会从 A 移除
      new CommonsChunkPlugin({
        name: ['polyfills', 'vendor'].reverse()
      }),
      /**
       * Plugin: ContextReplacementPlugin
       * Description: Provides context to Angular's use of System.import
       * 提供 Angular 使用 System.import 的上下文
       * See: https://webpack.github.io/docs/list-of-plugins.html#contextreplacementplugin
       * See: https://github.com/angular/angular/issues/11580
       */
      new ContextReplacementPlugin(
        // The (\\|\/) piece accounts for path separators in *nix and Windows
        /angular(\\|\/)core(\\|\/)src(\\|\/)linker/,
        helpers.root('src'), // location of your src
        {
          // 路由映射
          // your Angular Async Route paths relative to this root directory
        }
      ),
      /*
       * Plugin: CopyWebpackPlugin
       * Description: Copy files and directories in webpack.
       *
       * Copies project static assets.
       * 复制项目静态资源
       * See: https://www.npmjs.com/package/copy-webpack-plugin
       */
      new CopyWebpackPlugin([
        { from: 'src/assets', to: 'assets' },
        { from: 'src/meta'}
      ]),
      /*
       * Plugin: HtmlWebpackPlugin
       * Description: Simplifies creation of HTML files to serve your webpack bundles.
       * This is especially useful for webpack bundles that include a hash in the filename
       * which changes every compilation.
       * 自动注入 script 和 link 等
       * HtmlWebpackPlugin 插件使用了 publicPath 和 filename 设置， 来向 index.html 中插入适当的 <script> 和 <link> 标签。
       * See: https://github.com/ampedandwired/html-webpack-plugin
       */
      new HtmlWebpackPlugin({
        template: 'src/index.html',
        title: METADATA.title,
        chunksSortMode: 'dependency',
        metadata: METADATA,
        inject: 'head'
      }),
      /*
       * Plugin: ScriptExtHtmlWebpackPlugin
       * Description: Enhances html-webpack-plugin functionality
       * with different deployment options for your scripts including:
       * JS 默认 defer
       * See: https://github.com/numical/script-ext-html-webpack-plugin
       */
      new ScriptExtHtmlWebpackPlugin({
        defaultAttribute: 'defer'
      }),
      /*
       * Plugin: HtmlElementsPlugin
       * Description: Generate html tags based on javascript maps.
       *
       * If a publicPath is set in the webpack output configuration, it will be automatically added to
       * href attributes, you can disable that by adding a "=href": false property.
       * You can also enable it to other attribute by settings "=attName": true.
       *
       * The configuration supplied is map between a location (key) and an element definition object (value)
       * The location (key) is then exported to the template under then htmlElements property in webpack configuration.
       *
       * Example:
       *  Adding this plugin configuration
       *  new HtmlElementsPlugin({
       *    headTags: { ... }
       *  })
       *
       *  Means we can use it in the template like this:
       *  <%= webpackConfig.htmlElements.headTags %>
       * 根据 map 生成 headTags
       * Dependencies: HtmlWebpackPlugin
       */
      new HtmlElementsPlugin({
        headTags: require('./head-config.common')
      }),
      /**
       * Plugin LoaderOptionsPlugin (experimental)
       *
       * See: https://gist.github.com/sokra/27b24881210b56bbaff7#loader-options--minimize
       */
      new LoaderOptionsPlugin({}),
      // Fix Angular 2
      // 模块路径替换, 指定模块路径或者搜索路径
      new NormalModuleReplacementPlugin(
        /facade(\\|\/)async/,
        helpers.root('node_modules/@angular/core/src/facade/async.js')
      ),
      new NormalModuleReplacementPlugin(
        /facade(\\|\/)collection/,
        helpers.root('node_modules/@angular/core/src/facade/collection.js')
      ),
      new NormalModuleReplacementPlugin(
        /facade(\\|\/)errors/,
        helpers.root('node_modules/@angular/core/src/facade/errors.js')
      ),
      new NormalModuleReplacementPlugin(
        /facade(\\|\/)lang/,
        helpers.root('node_modules/@angular/core/src/facade/lang.js')
      ),
      new NormalModuleReplacementPlugin(
        /facade(\\|\/)math/,
        helpers.root('node_modules/@angular/core/src/facade/math.js')
      ),
    ],
    /*
     * Include polyfills or mocks for various node stuff
     * Description: Node configuration
     * TODO
     * See: https://webpack.github.io/docs/configuration.html#node
     */
    node: {
      global: true,
      crypto: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
