// 鱼类真实照片映射（由 tools/fetch-fish-images.mjs 在 CI 中自动生成并回填）。
// 结构：{ [fishId]: { url, license, licenseUrl, author, source, sourceUrl } }
// 留空时应用回退到自制 SVG 插画；抓取后此文件被覆盖。
export const images = {};
