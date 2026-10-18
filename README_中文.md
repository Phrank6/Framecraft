# Framecraft 本地运行与交付

当前仓库是场景数据协议与 Three.js 渲染器的基础工程，不是完整的 AI 分镜产品。示例使用 Café Lumière：两个镜头、可切换的渲染设置和截图导出。

## 本地运行

在包含 `package.json` 的项目根目录执行：

```bash
npm install
npm run check
npm run dev
```

浏览器打开 Vite 输出的本地网址（通常为 `http://localhost:5173`）。在左侧或时间轴切换镜头；右侧修改色调映射、曝光、环境光、方向光、阴影和质量档位。可以导出当前帧及三组对比实验。

如果通过 nvm 安装 Node.js 后新终端找不到 npm，请先加载对应的 Node 环境。例如此前的 macOS 安装位置为 `~/.nvm/versions/node/v24.22.0/bin`，但每台电脑的版本可能不同。

## 核心交付

- `src/schema/`：六个 Zod Contract 与跨对象引用验证；William 的三个源文件未修改。
- `src/data/`：咖啡馆示例及 JSON 数据。
- `src/renderer/`：Three.js、sRGB、None/ACES/AgX、HDR/PMREM、阴影和 Draft/Review/Capture。
- `src/ui/`、`src/styles/`：工作台界面及参数控件。
- `tests/`：数据验证和界面逻辑测试。

真实摄影 HDRI 为可选下载：`npm run assets:hdri`。项目默认自带的是**程序生成的 HDR 环境光**，不是摄影图片。

## 提交到 GitHub

先克隆 [Phrank6/Framecraft](https://github.com/Phrank6/Framecraft)；把本 ZIP 中的项目文件复制到**仓库根目录**（不要多嵌套一层），然后执行：

```bash
git switch -c feat/scene-schema-renderer
npm install
npm run check
git add .
git commit -m "feat: add scene contracts and renderer workspace"
git push -u origin feat/scene-schema-renderer
```

在 GitHub 创建 Pull Request，要求相关负责人审核。当前示例代码不等于两条独立开发线已完成接入；Schema 冻结标签、PR 合并、Notion 截图发布也必须实际执行之后才能标记完成。验收要求参见 `docs/QA.md`。

也可以使用项目自带的 `bash scripts/publish-to-github.sh` 创建并推送新的审核分支。它不会直接修改远端 `main`，也不会自动合并或打标签。需要你本机的 GitHub 登录具有仓库写入权限。
