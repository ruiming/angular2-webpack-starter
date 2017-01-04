var path = require('path');
// process.env.npm_lifecycle_event 返回当前正在运行的脚本名称
const EVENT = process.env.npm_lifecycle_event || '';
// Helper functions
// 项目根目录
var ROOT = path.resolve(__dirname, '..');
// 启动参数包含 flag 与否
function hasProcessFlag(flag) {
  return process.argv.join('').indexOf(flag) > -1;
}
// TODO: NODE 参数 flag 与否
function hasNpmFlag(flag) {
  return EVENT.includes(flag);
}
// 当前是否是 dev 服务器
function isWebpackDevServer() {
  return process.argv[1] && !! (/webpack-dev-server/.exec(process.argv[1]));
}
// 获取 args 相对 root 的路径
function root(args) {
  args = Array.prototype.slice.call(arguments, 0);
  return path.join.apply(path, [ROOT].concat(args));
}

exports.hasProcessFlag = hasProcessFlag;
exports.hasNpmFlag = hasNpmFlag;
exports.isWebpackDevServer = isWebpackDevServer;
exports.root = root;
