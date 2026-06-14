# 3D 模型目录

把鱼的 GLB 模型放在这里，并在 `js/data/fish.js` 对应鱼种设置 `modelUrl`。

- 鳜鱼：`assets/models/mandarinfish.glb`（已在数据中引用）

应用会在鱼详情页的「🧊 3D 模型」里加载该 GLB；若文件缺失或加载失败，会自动回退到程序化生成的 3D 鱼。
加载后控制台与画面左下角会显示「模型检查器」结果（骨骼/morph/动画/可张嘴情况）。
如模型为 Draco/Meshopt 压缩，需要额外解码器（届时再加）。
