/* 地图选点与照片信息卡共用同一枚定位针。
   图形底边 y=36 就是尖点，也是 MapLibre 的底部锚点；
   因此针尖与经纬度对应的地图位置严格重合。 */
(() => {
  function innerHTML(prefix = "photo-map-pin") {
    const headId = `${prefix}-head`;
    const stemId = `${prefix}-stem`;
    return `
      <defs>
        <radialGradient id="${headId}" cx="35%" cy="24%" r="78%">
          <stop offset="0" stop-color="#ff9a96"></stop>
          <stop offset="0.34" stop-color="#ee4a45"></stop>
          <stop offset="0.72" stop-color="#c52624"></stop>
          <stop offset="1" stop-color="#7e1112"></stop>
        </radialGradient>
        <linearGradient id="${stemId}" x1="0" x2="1">
          <stop offset="0" stop-color="#4e5155"></stop>
          <stop offset="0.42" stop-color="#f7f7f5"></stop>
          <stop offset="0.7" stop-color="#a7aaad"></stop>
          <stop offset="1" stop-color="#55585c"></stop>
        </linearGradient>
      </defs>
      <ellipse cx="13" cy="34.25" rx="3.1" ry="0.72"
               fill="rgba(20, 28, 38, 0.2)"></ellipse>
      <path d="M11.15 18.9h3.7l-.25 10.7L13 36l-1.58-6.4Z"
            fill="url(#${stemId})"></path>
      <circle cx="13" cy="10.4" r="9.2"
              fill="url(#${headId})"
              stroke="rgba(89, 8, 10, 0.22)" stroke-width="0.6"></circle>
      <ellipse cx="9.4" cy="6.7" rx="3.2" ry="2.25"
               fill="rgba(255, 255, 255, 0.48)"
               transform="rotate(-24 9.4 6.7)"></ellipse>
      <path d="M16.7 5.4a6.2 6.2 0 0 1 2.3 4.1"
            fill="none" stroke="rgba(255, 220, 218, 0.28)"
            stroke-width="0.8" stroke-linecap="round"></path>`;
  }

  window.AlbumMapPinIcon = Object.freeze({ innerHTML });
})();
