'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const checks = [
  ['Electron 主进程', path.join(projectRoot, 'electron', 'main.js')],
  ['本地服务', path.join(projectRoot, 'server', 'index.js')],
  ['前端入口', path.join(projectRoot, 'web', 'index.html')],
  ['应用图标', path.join(projectRoot, 'assets', 'fotora.ico')],
  ['FFmpeg', path.join(projectRoot, 'vendor', 'ffmpeg.exe')],
  ['ExifTool', path.join(projectRoot, 'vendor', 'exiftool', 'exiftool.exe')],
  ['DNGLab', path.join(projectRoot, 'vendor', 'dnglab', 'dnglab.exe')],
  ['Sharp', path.join(projectRoot, 'node_modules', 'sharp', 'package.json')],
  ['Electron', path.join(projectRoot, 'node_modules', 'electron', 'package.json')]
];

let failed = false;
for (const [name, file] of checks) {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '[OK]  ' : '[缺失]'} ${name}: ${file}`);
  failed ||= !exists;
}

if (failed) {
  console.error('\n运行组件不完整，请先执行：npm install');
  process.exitCode = 1;
} else {
  console.log('\n工程结构完整，可以执行 npm start。');
}
