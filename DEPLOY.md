# 从 GitHub 部署到 Vercel

本仓库已经包含 Vercel 配置。网页部署为静态资源，模型接口部署为 Node.js Function。

## 1. 导入仓库

1. 打开 https://vercel.com/new ，使用 GitHub 登录。
2. 找到 `yyy99920/infinite-canvas`，点击 **Import**。如果没有看到，检查 Vercel 的 GitHub 仓库授权范围。
3. Framework Preset 选择 **Other**；Root Directory 保持仓库根目录 `./`。
4. 仓库中的 `vercel.json` 已指定 Build Command 为 `npm run build`，Output Directory 为 `dist`。不要使用 `npm start` 作为构建命令。
5. Node.js 使用 **24.x**，与 `package.json` 一致。

## 2. 添加环境变量

在部署页面展开 **Environment Variables**，填入：

| Name | Value |
| --- | --- |
| `MODEL_BASE_URL` | 你的 OpenAI 兼容接口地址，例如 `https://供应商域名/v1`，必须使用 HTTPS |
| `MODEL_NAME` | 供应商实际提供的模型 ID |
| `MODEL_API_KEY` | 供应商提供的 API Key |
| `APP_ACCESS_CODE` | 自己设置的随机访问码，16–256 位英文字母、数字或符号，不含空格 |
| `MODEL_VISION` | 可选；模型支持图片输入时填 `true`，否则填 `false` 或不填 |

这些值只填在 Vercel 的环境变量中，不要粘贴到 GitHub 文件或提交记录里。根据需要选择 Production / Preview 环境。修改环境变量后必须重新部署才会生效。

访问码用于保护会消耗额度的模型接口。网页本身可以打开；它不是多用户账号系统。不要公开分享访问码。

## 3. 部署并使用

1. 点击 **Deploy**，等待状态变为 **Ready**。
2. 打开分配的 `*.vercel.app` 地址。
3. 添加脚本编辑器，点击 **连接创意模型**。
4. 输入 `APP_ACCESS_CODE` 对应的访问码，点击 **连接模型**。连接本身不会调用模型。
5. 填写创意描述、时长和比例，点击 **生成创意方向**，会请求模型生成 4 个方向。

访问码只在当前页面内存中保存，刷新页面后重新输入。API Key 不返回浏览器，不写入项目文件。更换接口、密钥或模型时，在 Vercel 环境变量中修改后重新部署。

## 4. 把本机画布带到线上

本机地址和线上地址的浏览器存储相互独立：先在本机页面点击 **导出项目**，然后在线上平台点击左侧文件夹按钮，导入导出的 `.frame.json` 文件。

画布仍保存在当前浏览器，不自动上传 GitHub，也不在不同电脑间同步。

## 常见问题

- **页面能打开，但提示部署配置未完成**：检查 4 个必填环境变量，访问码至少 16 位；修改后 Redeploy。
- **访问码无效**：输入与 Vercel 中完全一致的值，注意不要带空格。
- **模型返回 401 / 404**：检查 `MODEL_API_KEY`、`MODEL_BASE_URL` 和 `MODEL_NAME` 是否与供应商文档一致。
- **参考图不能生成**：模型须支持 `image_url` 输入，并设置 `MODEL_VISION=true`。
- **图片请求过大**：Vercel Function 有请求体大小限制；本项目将总请求控制在 4 MB 内，请减少图片。
- **生成超时**：模型请求超时为 90 秒，Function 配置为 120 秒。若当前 Vercel 账号设置限制更低，请检查 Functions / Fluid Compute 配置。
- **GitHub 更新后线上没变化**：查看 Vercel Deployments 中的新构建；推送到 `main` 会触发关联项目的生产部署。

## 本地验证

```sh
npm run check
npm test
npm run build
npm start
```

本机服务仍支持在界面里填写模型配置；Vercel 线上服务使用环境变量和访问码。`dist/` 仅包含白名单内的浏览器资源。
