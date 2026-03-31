# AI Daily Report - 自动化日报系统

> 每日 9:00 自动抓取 GitHub、Hacker News、arXiv 信息，生成精美日报并发布到 Vercel

![Vercel Deploy](https://img.shields.io/badge/Vercel-Deployed-brightgreen)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)

---

## 🎯 功能特性

| 功能 | 描述 |
|------|------|
| 🤖 **自动抓取** | 每日 9:00 (北京时间) 自动运行 |
| 📊 **GitHub 热门** | 抓取 stars > 10000 的热门 AI 仓库 |
| 📰 **Hacker News** | 获取当日热门技术话题 |
| 📚 **arXiv 论文** | 最新 AI 论文智能分析与分类 |
| 🎨 **精美界面** | 响应式设计，支持深色/浅色模式 |
| 🚀 **自动部署** | 生成后自动发布到 Vercel |

---

## 📁 项目结构

```
ai-daily-report/
├── ai_daily_report.py    # Python 日报生成脚本
├── build.mjs             # 静态网站构建脚本
├── package.json          # npm 配置
├── vercel.json           # Vercel 部署配置
├── reports/              # Markdown 日报源文件
│   └── ai-daily-report-2026-03-31.md
├── docs/                 # 静态网站输出目录
│   ├── index.html        # 日报列表首页
│   └── 2026-03-31.html   # 单日报详情页
└── .github/workflows/
    ├── daily-report.yml  # ⭐ 每日定时任务
    └── deploy.yml        # Vercel 部署工作流
```

---

## 🚀 快速开始

### 本地运行

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/ai-daily-report.git
cd ai-daily-report

# 生成今日日报
python ai_daily_report.py

# 构建静态网站
npm install
npm run build

# 本地预览
npm run preview
```

### 命令行参数

```bash
# 指定日期
python ai_daily_report.py --date 2026-03-31

# 指定输出路径
python ai_daily_report.py --output custom-report.md
```

---

## ⚙️ 配置说明

### 必需的环境变量 (GitHub Secrets)

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `VERCEL_TOKEN` | Vercel API Token | [Vercel Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Organization ID | `vercel inspect` 查看 |
| `VERCEL_PROJECT_ID` | Project ID | Vercel 项目设置 |

### GitHub Actions 配置

定时任务在 `.github/workflows/daily-report.yml` 中定义：

```yaml
on:
  schedule:
    - cron: '0 1 * * *'  # UTC 1:00 = 北京时间 9:00
  workflow_dispatch:     # 支持手动触发
```

---

## 📊 数据来源

### GitHub API
- 查询: `AI+stars:>10000&sort=updated`
- 速率限制: 10 请求/分钟 (无需认证)

### Hacker News API
- 热门故事: `topstories.json`
- 故事详情: `item/{id}.json`

### arXiv API
- 端点: `export.arxiv.org/api/query`
- 分类: `cs.AI` (人工智能)
- 获取: 最新 5 篇论文

---

## 📝 arXiv 论文分析

每篇论文自动分析以下维度：

| 分析项 | 说明 |
|--------|------|
| **关键词提取** | LLM、CV、RL、Multi-Agent、Safety 等 |
| **论文类型** | Benchmark、综述、理论分析、应用研究 |
| **研究意义** | 自动生成研究价值描述 |
| **趋势统计** | 统计今日研究领域分布 |

---

## 🔧 部署到 Vercel

### 方式一: GitHub Actions (推荐)

1. Fork 本项目
2. 在 Vercel 创建新项目，导入仓库
3. 在 GitHub Settings → Secrets 添加:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
4. 工作流将自动在每日 9:00 运行

### 方式二: Vercel Cron

在 `vercel.json` 中添加:

```json
{
  "crons": [{
    "path": "/api/generate",
    "schedule": "0 9 * * *"
  }]
}
```

---

## 📄 示例输出

### 日报内容

```markdown
# AI 资源日报 - 2026-03-31

## GitHub 热门 AI 仓库

| 排名 | 项目 | 星标 | 语言 |
|------|------|------|------|
| 1 | langgenius/dify | 135,080 | TypeScript |
| 2 | agno-agi/agno | 39,042 | Python |

## Hacker News 热门话题

| 标题 | 得分 | 评论 |
|------|------|------|
| Universal Claude.md | 150 pts | 63 |

## arXiv 最新论文

### 1. Geometry-aware similarity metrics...

**作者**: N Alex Cayco Gajic
**关键词**: AI/ML, Benchmark
**研究意义**: 为该领域提供新的评估基准...
```

---

## 🤝 参与贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing`)
5. 创建 Pull Request

---

## 📜 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🔗 相关链接

- [GitHub Trending](https://github.com/trending)
- [Hacker News](https://news.ycombinator.com)
- [arXiv cs.AI](https://arxiv.org/list/cs.AI/recent)
- [Vercel](https://vercel.com)

---

*🤖 由 GitHub Actions 自动生成和部署*
