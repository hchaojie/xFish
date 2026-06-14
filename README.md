# 🐟 xFish · 鱼类图鉴

一款面向钓鱼与海洋爱好者的**鱼类科普图鉴 Web App**。借鉴《钓鱼发烧友》的"渔场 + 鱼种"设定，聚焦丰富的鱼类百科介绍与沉浸式水下场景。纯静态、零依赖、离线可用。

## ✨ 特性

- **四大渔场**：江河 / 湖泊 / 近海 / 深海，各有主题化的水下场景氛围（渐变水体、光束焦散、上浮气泡、摇曳水草、游动鱼群）。
- **24 种鱼**：每种鱼配有学名、英文名、体长体重、活动水深、适宜水温、活跃季节、食性、生息环境、推荐饵料钓法，以及一段科普介绍。
- **全图鉴**：网格浏览，支持按渔场 / 稀有度筛选与名称搜索。
- **彩色矢量插画**：每条鱼由**参数化 SVG 生成器**实时绘制（体型 / 配色 / 花纹 / 鳍 / 尾各异），版权干净、清晰可缩放。
- **响应式**：桌面与移动端自适应，尊重 `prefers-reduced-motion`。

## 🚀 本地运行

无需构建。任选其一：

```bash
# 方式一：Python
python3 -m http.server 8000

# 方式二：Node
npx serve .
```

然后浏览器打开 `http://localhost:8000`。

> 因使用浏览器原生 ES modules，需通过 http 服务访问（直接双击 `index.html` 受 file:// 跨域限制可能无法加载模块）。

## 📁 结构

```
index.html              入口，挂载 #scene(背景) 与 #app(视图)
css/styles.css          全局样式、卡片、详情页、响应式
css/scenes.css          水下场景动画
js/main.js              路由注册与启动
js/util/router.js       极简 hash 路由
js/data/fish.js         渔场定义 + 鱼种数据（含 SVG 参数、预留 imageUrl）
js/render/fishSvg.js    参数化 SVG 鱼生成器（核心）
js/render/scene.js      动态水下背景
js/views/*.js           home / ground / codex / detail 四个视图
assets/                 预留：真实图片素材
```

## 🗃️ 数据模型

`js/data/fish.js` 中每条鱼的结构：

```js
{
  id, name, sciName, enName,
  groundId,                 // river | lake | coastal | deepsea
  rarity,                   // common | rare | epic | legendary
  lengthCm: [min, max], weightKg: [min, max],
  depth, season, waterTemp, // 科普数值
  diet, habitat, baits,     // 食性、生息地、饵料/钓法
  desc,                     // 科普介绍段落
  svg: { body, palette, pattern, fin, tail, ... }, // 喂给 SVG 生成器
  imageUrl: null            // 预留：真实照片，填上即自动替换插画
}
```

新增鱼种：往 `fish` 数组追加一条即可，UI 与场景会自动纳入。

## 🛣️ 路线图

- **v1（当前）**：四渔场、24 种鱼、SVG 插画、图鉴/详情/筛选搜索、水下场景动画。
- **二期**：真实照片替换（填 `imageUrl` 即生效）、Three.js 3D 模型与逼真水缸/海底、收藏打卡、环境音效、更多鱼种与渔场。

## 📄 许可

见 [LICENSE](./LICENSE)。鱼类数据与矢量插画为本项目自制。
