#!/usr/bin/env python3
"""
AI Daily Report Generator v3.0
支持: GitHub API, Hacker News API, arXiv API (增强分析)
"""

import json
import urllib.request
import re
from datetime import datetime
import argparse
from collections import Counter


def fetch_github_repos(query="AI+stars:>10000", sort="updated", per_page=10):
    """获取 GitHub 热门 AI 仓库"""
    url = f"https://api.github.com/search/repositories?q={query}&sort={sort}&order=desc&per_page={per_page}"
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "AI-Daily-Report"}

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get("items", [])
    except Exception as e:
        print(f"[WARN] GitHub API 错误: {e}")
        return []


def fetch_hacker_news_stories(limit=5):
    """获取 Hacker News 热门故事"""
    try:
        top_url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        with urllib.request.urlopen(top_url, timeout=10) as response:
            story_ids = json.loads(response.read().decode())[:limit]

        stories = []
        for story_id in story_ids:
            story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
            with urllib.request.urlopen(story_url, timeout=5) as response:
                story = json.loads(response.read().decode())
                stories.append(story)
        return stories
    except Exception as e:
        print(f"[WARN] Hacker News API 错误: {e}")
        return []


def parse_arxiv_xml(xml_data):
    """解析 arXiv XML，提取论文核心信息"""
    papers = []
    entries = re.findall(r'<entry[^>]*>(.*?)</entry>', xml_data, re.DOTALL)

    for entry in entries[:5]:
        paper = {}

        title_match = re.search(r'<title>(.*?)</title>', entry, re.DOTALL)
        if title_match:
            paper['title'] = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()

        authors = re.findall(r'<name>(.*?)</name>', entry)
        paper['authors'] = ', '.join(authors[:3])
        if len(authors) > 3:
            paper['authors'] += ' et al.'

        summary_match = re.search(r'<summary>(.*?)</summary>', entry, re.DOTALL)
        if summary_match:
            summary = re.sub(r'<[^>]+>', '', summary_match.group(1)).strip()
            paper['summary'] = summary[:300] + '...' if len(summary) > 300 else summary

        id_match = re.search(r'<id>(.*?)</id>', entry)
        if id_match:
            paper['url'] = id_match.group(1).strip()

        published_match = re.search(r'<published>(.*?)</published>', entry)
        if published_match:
            paper['published'] = published_match.group(1)[:10]

        if paper.get('title'):
            papers.append(paper)

    return papers


def analyze_paper_keywords(summary):
    """分析论文关键词"""
    keywords = []
    summary_lower = summary.lower()

    keyword_map = {
        'LLM': ['llm', 'large language model', 'transformer', 'gpt'],
        'Computer Vision': ['vision', 'image', 'object detection', 'cnn'],
        'Reinforcement Learning': ['reinforcement learning', 'rl', 'autonomous'],
        'Multi-Agent': ['multi-agent', 'agentic', 'agents'],
        'Safety & Ethics': ['safety', 'fairness', 'bias', 'ethics', 'alignment'],
        'Generative AI': ['generative', 'diffusion', 'gan'],
        'Psychometrics': ['psychometric', 'psychological', 'scale'],
        'Facial Recognition': ['facial', 'face recognition'],
        'Self-Improving': ['self-improving', 'self-modification'],
    }

    for category, terms in keyword_map.items():
        if any(term in summary_lower for term in terms):
            keywords.append(category)

    return keywords[:3]


def analyze_paper_type(title, summary):
    """分析论文类型"""
    text = (title + " " + summary).lower()
    types = []

    if 'benchmark' in text:
        types.append('Benchmark')
    if 'survey' in text or 'review' in text:
        types.append('综述')
    if 'tutorial' in text:
        types.append('教程')
    if 'limit' in text or 'theoretical' in text:
        types.append('理论分析')
    if 'autonomous' in text or 'robot' in text:
        types.append('应用研究')

    return types if types else ['基础研究']


def generate_paper_analysis(paper, index):
    """生成单篇论文分析"""
    title = paper.get('title', 'N/A')
    authors = paper.get('authors', 'Unknown')
    summary = paper.get('summary', '')
    url = paper.get('url', '')
    published = paper.get('published', '')

    keywords = analyze_paper_keywords(summary)
    paper_types = analyze_paper_type(title, summary)

    # 生成研究意义
    significance = ""
    if 'Safety & Ethics' in keywords:
        significance = "关注 AI 系统的安全性和公平性，对负责任地部署 AI 具有重要指导意义。"
    elif 'Benchmark' in paper_types:
        significance = "提供新的评估基准，推动该领域的标准化研究。"
    elif 'Reinforcement Learning' in keywords:
        significance = "强化学习在实际系统中的应用，具有重要的工程实践价值。"
    elif 'Multi-Agent' in keywords:
        significance = "多智能体协作研究，对分布式 AI 系统发展具有重要意义。"
    elif 'Computer Vision' in keywords:
        significance = "计算机视觉技术进展，可应用于多个实际场景。"
    else:
        significance = "为该领域提供新的理论或方法贡献。"

    return f"""### {index}. {title}

**作者**: {authors}
**发布日期**: {published}
**链接**: [{url}]({url})

**关键词**: {', '.join(keywords) if keywords else 'AI/ML'}
**类型**: {', '.join(paper_types)}

**核心内容**:
{summary}

**研究意义**: {significance}

---

"""


def generate_trend_analysis(papers):
    """生成趋势分析"""
    if not papers:
        return ""

    all_keywords = []
    for paper in papers:
        all_keywords.extend(analyze_paper_keywords(paper.get('summary', '')))

    if not all_keywords:
        return ""

    keyword_counts = Counter(all_keywords)

    analysis = """## 论文趋势分析

### 今日研究热点分布

| 研究领域 | 论文数量 |
|----------|----------|
"""
    for keyword, count in keyword_counts.most_common(5):
        analysis += f"| {keyword} | {count} 篇 |\n"

    analysis += """
### 关键洞察

"""

    # 基于关键词生成洞察
    top_keywords = [k for k, _ in keyword_counts.most_common(3)]

    if 'Safety & Ethics' in top_keywords:
        analysis += "- **AI 安全与伦理**是当前研究热点，反映学术界对负责任 AI 的重视。\n"
    if 'Multi-Agent' in top_keywords:
        analysis += "- **多智能体系统**研究活跃，预示分布式 AI 应用的发展趋势。\n"
    if 'Reinforcement Learning' in top_keywords:
        analysis += "- **强化学习**持续受到关注，特别是在自主系统领域。\n"
    if 'Computer Vision' in top_keywords:
        analysis += "- **计算机视觉**技术不断进步，应用场景持续拓展。\n"

    analysis += "\n---\n\n"
    return analysis


def generate_report(date_str, github_repos, hn_stories, arxiv_papers):
    """生成完整报告"""

    report = f"""# AI 资源日报 - {date_str}

> 自动生成时间: {date_str}
> 数据来源: GitHub API, Hacker News API, arXiv API

---

## GitHub 热门 AI 仓库 (今日更新)

| 排名 | 项目 | 描述 | 星标 | 语言 |
|------|------|------|------|------|
"""

    if github_repos:
        for i, repo in enumerate(github_repos[:10], 1):
            name = repo.get("full_name", "N/A")
            desc = (repo.get("description", "") or "")[:50]
            if len(repo.get("description", "")) > 50:
                desc += "..."
            stars = repo.get("stargazers_count", 0)
            lang = repo.get("language", "-") or "-"
            url = repo.get("html_url", "")
            report += f"| {i} | [{name}]({url}) | {desc} | {stars:,} | {lang} |\n"
    else:
        report += "| - | 无法获取数据 | - | - | - |\n"

    report += """
---

## Hacker News 热门技术话题

| 标题 | 得分 | 评论 | 链接 |
|------|------|------|------|
"""

    for story in hn_stories[:5]:
        title = story.get("title", "N/A")
        score = story.get("score", 0)
        comments = story.get("descendants", 0)
        url = story.get("url", f"https://news.ycombinator.com/item?id={story.get('id')}")
        report += f"| {title} | {score} pts | {comments} | [链接]({url}) |\n"

    report += f"""
---

## arXiv 最新 AI 论文深度分析 (cs.AI)

> 来源: http://export.arxiv.org/api/query
> 获取数量: {len(arxiv_papers)} 篇

"""

    if arxiv_papers:
        for i, paper in enumerate(arxiv_papers, 1):
            report += generate_paper_analysis(paper, i)

        report += generate_trend_analysis(arxiv_papers)
    else:
        report += """*无法获取 arXiv 数据，请稍后重试或手动访问:*
- http://arxiv.org/list/cs.AI/recent
- http://export.arxiv.org/rss/cs.AI

---

"""

    report += """## 本周技术趋势

| 趋势 | 热度 | 相关项目 |
|------|------|----------|
| AI Agent 平台 | HIGH | Langflow, Dify, CrewAI |
| MCP 协议 | MEDIUM | Claude Desktop, Cursor |
| AI Gateway | MEDIUM | LiteLLM, Portkey |
| 本地 LLM | LOW | Ollama, llama.cpp |

---

## 工具推荐

| 工具 | 类型 | 星标 | 链接 |
|------|------|------|------|
| Langflow | AI Agent 平台 | 146,425 | https://github.com/langflow-ai/langflow |
| n8n | 工作流自动化 | 181,779 | https://github.com/n8n-io/n8n |
| LiteLLM | AI Gateway | 41,591 | https://github.com/BerriAI/litellm |
| Ollama | 本地 LLM | 134,000+ | https://ollama.ai |

---

*本日报由 AI Daily Report Generator 自动生成*
*生成时间: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """*
"""

    return report


def fetch_arxiv_papers(category="cs.AI", max_results=5):
    """获取 arXiv 论文"""
    api_url = f"http://export.arxiv.org/api/query?search_query=cat:{category}&start=0&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"

    try:
        req = urllib.request.Request(api_url, headers={'User-Agent': 'AI-Daily-Report/1.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read().decode()
            if xml_data and len(xml_data) > 100:
                return parse_arxiv_xml(xml_data)
    except Exception as e:
        print(f"   [WARN] arXiv API 失败: {e}")

    return []


def main():
    parser = argparse.ArgumentParser(description="AI Daily Report Generator")
    parser.add_argument("--date", help="指定日期 (YYYY-MM-DD)", default=None)
    parser.add_argument("--output", help="输出文件路径", default=None)
    args = parser.parse_args()

    date_str = args.date or datetime.now().strftime("%Y-%m-%d")
    output_file = args.output or f"ai-daily-report-{date_str}.md"

    print(f"[START] 开始生成 AI 日报: {date_str}")
    print("=" * 50)

    print("[1/3] GitHub 热门仓库...")
    github_repos = fetch_github_repos()
    print(f"   [OK] 获取到 {len(github_repos)} 个仓库")

    print("[2/3] Hacker News 热门话题...")
    hn_stories = fetch_hacker_news_stories()
    print(f"   [OK] 获取到 {len(hn_stories)} 个话题")

    print("[3/3] arXiv 论文...")
    arxiv_papers = fetch_arxiv_papers()
    print(f"   [OK] 获取到 {len(arxiv_papers)} 篇论文")

    print("\n[INFO] 正在生成 Markdown 报告...")
    report = generate_report(date_str, github_repos, hn_stories, arxiv_papers)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(report)

    print("=" * 50)
    print(f"[DONE] 日报已生成: {output_file}")
    print(f"\n[SUMMARY]")
    print(f"   - GitHub 仓库: {len(github_repos)} 个")
    print(f"   - HN 话题: {len(hn_stories)} 个")
    print(f"   - arXiv 论文: {len(arxiv_papers)} 篇")


if __name__ == "__main__":
    main()
