'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const vendorDir = path.join(projectRoot, 'vendor');
const ffmpegTarget = path.join(vendorDir, 'ffmpeg.exe');

fs.mkdirSync(vendorDir, { recursive: true });

let ffmpegSource = '';
try {
  ffmpegSource = require('@ffmpeg-installer/ffmpeg').path;
} catch {
  console.warn('未找到 @ffmpeg-installer/ffmpeg，请先执行 npm install。');
}

if (ffmpegSource && fs.existsSync(ffmpegSource)) {
  const source = path.resolve(ffmpegSource);
  const target = path.resolve(ffmpegTarget);
  if (source !== target) {
    fs.copyFileSync(source, target);
    console.log(`已准备 FFmpeg：${target}`);
  }
} else if (!fs.existsSync(ffmpegTarget)) {
  console.warn('FFmpeg 暂未准备，视频缩略图与视频导出会不可用。');
}

const requiredRuntime = [
  ['ExifTool', path.join(vendorDir, 'exiftool', 'exiftool.exe')],
  ['DNGLab', path.join(vendorDir, 'dnglab', 'dnglab.exe')]
];

for (const [name, file] of requiredRuntime) {
  if (!fs.existsSync(file)) {
    throw new Error(`缺少 ${name} 运行组件：${file}`);
  }
}

console.log('项目运行组件检查完成。');
