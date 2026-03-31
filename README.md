# 📋 日报静态站点

将每日 Markdown 日报自动发布到 Vercel 的静态站点。

## 🚀 快速开始

### 1. 初始化项目

```bash
npm install
```

### 2. 添加日报

将每日日报放入 `reports/` 目录，文件名格式：`YYYY-MM-DD.md`

```markdown
# 2026-03-31 工作日报

## 今日完成
- 完成任务1
- 完成任务2

## 明日计划
- 计划任务1
```

### 3. 本地预览

```bash
npm run build    # 构建站点
npm run preview  # 预览效果
```

## ☁️ 部署到 Vercel

### 方式一：Vercel CLI（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（首次会引导配置）
vercel

# 生产环境部署
vercel --prod
```

### 方式二：GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 登录 [Vercel](https://vercel.com)
3. 点击 "Import Project"
4. 选择你的 GitHub 仓库
5. Vercel 会自动检测并使用 `vercel.json` 配置
6. 点击 Deploy！

### 方式三：GitHub Actions 自动部署

1. 在 Vercel Dashboard 获取：
   - `VERCEL_TOKEN` - Settings → Tokens
   - `VERCEL_ORG_ID` - Settings → Teams → ID
   - `VERCEL_PROJECT_ID` - 项目 Settings → General → ID

2. 在 GitHub 仓库 Settings → Secrets 添加以上三个密钥

3. 推送代码后会自动部署

## 📁 目录结构

```
.
├── reports/           # 日报 md 文件放这里
│   └── 2026-03-31.md
├── docs/              # 构建输出的静态文件
│   ├── index.html     # 日报列表页
│   └── 2026-03-31.html
├── build.mjs          # 构建脚本
├── vercel.json        # Vercel 配置
└── package.json
```

## 🔄 自动化流程

```
每日写日报 → 推送到 GitHub → Vercel 自动构建部署 → 网站更新
```

或使用 Vercel 的 [Git Hooks](https://vercel.com/docs/concepts/git#deploy-hooks) 触发构建：
```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/DEPLOY_HOOK_ID
```

## ⚙️ 自定义

- 修改 `docs/index.html` 定制列表页样式
- 修改 `build.mjs` 中的 `generateReportPage()` 定制日报页样式
- 修改 `vercel.json` 调整构建配置

## 🌐 访问

部署成功后，访问 `your-project.vercel.app` 即可查看日报站点！
