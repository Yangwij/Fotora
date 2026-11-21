# Recovery notes

## Identification

- Input: released Windows installer
- Input size: 144595014 bytes
- SHA-256: `D8175C30BA8DAD9EC368CFD25254F287E4C0A2B9BF634BB7170A58250A744943`
- Installer: NSIS 3.04
- Application: Electron 44.9.0
- Inner archive: `resources/app.asar`
- Inner app version: not exposed to users

## Extraction

The NSIS payload was opened as a 7-Zip stream. `resources/app.asar` was then
unpacked with `@electron/asar`. `resources/app.asar.unpacked` was merged from
the installer because it contains native Sharp and libvips binaries. ExifTool
and DNGLab were copied from the installer's `resources` directory.

The main application code was already stored as readable JavaScript. Vite
bundles under `web/photo-wall/assets` had no source maps, so they can only be
reformatted and edited from their generated modules.

## Runtime adaptation

The original development entry expects:

- `assets/fotora.ico`
- `vendor/ffmpeg.exe`
- `exiftool/exiftool.exe`
- `vendor/dnglab/dnglab.exe`

ExifTool was kept in `vendor/exiftool` because the application locates the
bundled development copy through `process.env.EXIFTOOL`. FFmpeg is copied from
the `@ffmpeg-installer/ffmpeg` npm package during `postinstall`.
