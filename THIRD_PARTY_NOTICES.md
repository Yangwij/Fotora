# Third-party notices

This repository contains or installs third-party software. The application
code itself is marked `UNLICENSED`; the following components keep their own
licenses.

| Component | Version / location | License | Source |
| --- | --- | --- | --- |
| Electron | 44.9.0, installed by npm | MIT plus bundled Chromium notices | https://github.com/electron/electron |
| sharp / libvips | 0.35.5, installed by npm | Apache-2.0; libvips LGPL-3.0-or-later | https://github.com/lovell/sharp |
| @ffmpeg-installer/ffmpeg / FFmpeg | 1.1.0 package, installed by npm | See the license files shipped by the package and FFmpeg build | https://github.com/kribblo/node-ffmpeg-installer |
| ExifTool | `vendor/exiftool` | Artistic-2.0 or GPL-3.0 | https://exiftool.org |
| DNGLab | `vendor/dnglab/dnglab.exe` | LGPL-2.1 | https://github.com/dnglab/dnglab |
| MapLibre GL JS | `web/map/vendor` | BSD-3-Clause | https://github.com/maplibre/maplibre-gl-js |

ExifTool's full license is included in
`vendor/exiftool/exiftool_files/LICENSE`. DNGLab's license is included in
`vendor/dnglab/LICENSE`. Package licenses for npm dependencies are installed
under `node_modules` after `npm install`.
