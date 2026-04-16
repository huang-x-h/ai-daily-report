#!/usr/bin/env python3
"""
AI Daily Report Generator v4.0
支持: GitHub API, Hacker News API, arXiv API, Reddit, RSS Feeds, 中文科技媒体
"""

import json
import urllib.request
import re
import os
from datetime import datetime
import argparse
from collections import Counter
import xml.etree.ElementTree as ET


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


def fetch_hacker_news_stories(limit=10):
    """获取 Hacker News 热门故事 (筛选 AI 相关)"""
    ai_keywords = ['ai', 'llm', 'gpt', 'machine learning', 'neural', 'deep learning', 
                   'openai', 'anthropic', 'claude', 'gemini', 'agent', 'language model']
    
    try:
        top_url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        with urllib.request.urlopen(top_url, timeout=10) as response:
            story_ids = json.loads(response.read().decode())[:50]  # 获取更多以筛选

        stories = []
        for story_id in story_ids:
            if len(stories) >= limit:
                break
            story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
            try:
                with urllib.request.urlopen(story_url, timeout=5) as response:
                    story = json.loads(response.read().decode())
                    title_lower = story.get("title", "").lower()
                    # 筛选 AI 相关内容
                    if any(kw in title_lower for kw in ai_keywords):
                        stories.append(story)
            except:
                continue
        return stories
    except Exception as e:
        print(f"[WARN] Hacker News API 错误: {e}")
        return []


def fetch_reddit_posts(subreddits=None, limit=5):
    """获取 Reddit AI 相关帖子"""
    if subreddits is None:
        subreddits = ['MachineLearning', 'Artificial', 'LocalLLaMA', 'ChatGPT', 'singularity']
    
    all_posts = []
    
    for subreddit in subreddits:
        try:
            url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                posts = data.get('data', {}).get('children', [])
                for post in posts[:3]:
                    post_data = post.get('data', {})
                    all_posts.append({
                        'subreddit': subreddit,
                        'title': post_data.get('title', ''),
                        'score': post_data.get('score', 0),
                        'comments': post_data.get('num_comments', 0),
                        'url': post_data.get('url', ''),
                        'permalink': f"https://reddit.com{post_data.get('permalink', '')}"
                    })
        except Exception as e:
            print(f"[WARN] Reddit r/{subreddit} 错误: {e}")
            continue
    
    # 按热度排序
    all_posts.sort(key=lambda x: x['score'], reverse=True)
    return all_posts[:limit]


def parse_rss_feed(url, source_name="RSS"):
    """解析 RSS Feed"""
    items = []
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read().decode('utf-8', errors='ignore')
        
        root = ET.fromstring(xml_data)
        
        # 对于 RSS 2.0，直接查找 item
        # 对于 Atom，直接查找 entry
        item_tags = ['item', 'entry']
        
        for item_tag in item_tags:
            for item in root.iter(item_tag):
                entry = {}
                
                # 标题 - 直接查找，不使用 namespace
                for t in item.iter('title'):
                    if t.text:
                        entry['title'] = re.sub(r'<[^>]+>', '', t.text).strip()
                        break
                
                # 链接 - RSS 用 <link>，Atom 用 <link href="...">
                for l in item.iter('link'):
                    if l.text and l.text.strip():
                        entry['url'] = l.text.strip()
                        break
                    elif l.get('href'):
                        entry['url'] = l.get('href')
                        break
                
                # 描述/摘要
                for desc_tag in ['description', 'summary', 'content']:
                    for d in item.iter(desc_tag):
                        if d.text:
                            entry['description'] = re.sub(r'<[^>]+>', '', d.text).strip()[:200]
                            break
                    if 'description' in entry:
                        break
                
                # 日期
                for date_tag in ['published', 'updated', 'pubDate', 'dc:date']:
                    for d in item.iter(date_tag):
                        if d.text:
                            entry['date'] = d.text[:10]
                            break
                    if 'date' in entry:
                        break
                
                if entry.get('title') and entry.get('url'):
                    entry['source'] = source_name
                    items.append(entry)
                
                if len(items) >= 5:
                    break
            if len(items) >= 5:
                break
        
        return items[:5]
    except Exception as e:
        print(f"[WARN] RSS {source_name} 错误: {e}")
        return []


def fetch_ai_blogs():
    """获取 AI 博客 RSS"""
    feeds = [
        ("https://blogs.nvidia.com/feed/", "NVIDIA Blog"),
        ("https://syncedreview.com/feed/", "Synced Review"),
        ("https://aws.amazon.com/blogs/machine-learning/feed/", "AWS ML Blog"),
        ("https://venturebeat.com/ai/feed/", "VentureBeat AI"),
    ]
    
    all_items = []
    for url, name in feeds:
        items = parse_rss_feed(url, name)
        if items:
            all_items.extend(items)
    
    # 按日期排序（取最新的）
    all_items.sort(key=lambda x: x.get('date', ''), reverse=True)
    return all_items[:10]


def fetch_chinese_tech_news():
    """获取中文科技媒体新闻"""
    feeds = [
        ("https://36kr.com/feed", "36氪"),
        ("https://blog.csdn.net/Rss", "CSDN"),
    ]
    
    # 可选：RSSHub 源（如果配置了可用的 RSSHub 地址）
    rsshub_url = os.getenv('RSSHUB_URL', '')
    if rsshub_url:
        try:
            feeds.extend([
                (f"{rsshub_url}/36kr/feed/tech", "36氪科技(RSSHub)"),
                (f"{rsshub_url}/weibo/search/%E4%BA%BA%E8%83%BD", "微博AI搜索(RSSHub)"),
            ])
        except Exception:
            pass
    
    all_items = []
    ai_keywords = ['ai', '人工智能', '大模型', 'llm', 'gpt', '机器学习', '深度学习', 
                   'chatgpt', 'openai', 'llama', 'agent', '智能体', 'aigc', '生成式']
    
    for url, name in feeds:
        items = parse_rss_feed(url, name)
        for item in items:
            title_lower = item.get('title', '').lower()
            if any(kw in title_lower for kw in ai_keywords):
                all_items.append(item)
    
    return all_items[:10]


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


def generate_report(date_str, github_repos, hn_stories, arxiv_papers, reddit_posts, ai_blogs, cn_news):
    """生成完整报告"""

    report = f"""# AI 资源日报 - {date_str}

> 自动生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M")}
> 数据来源: GitHub, Hacker News, arXiv, Reddit, AI Blogs, 36氪

---

## 🔥 GitHub 热门 AI 仓库

| 排名 | 项目 | 描述 | 星标 | 语言 |
|------|------|------|------|------|
"""

    if github_repos:
        for i, repo in enumerate(github_repos[:10], 1):
            name = repo.get("full_name", "N/A")
            desc = (repo.get("description", "") or "")[:50]
            if len(repo.get("description", "") or "") > 50:
                desc += "..."
            stars = repo.get("stargazers_count", 0)
            lang = repo.get("language", "-") or "-"
            url = repo.get("html_url", "")
            report += f"| {i} | [{name}]({url}) | {desc} | {stars:,} | {lang} |\n"
    else:
        report += "| - | 无法获取数据 | - | - | - |\n"

    report += """
---

## 📰 Hacker News AI 话题

"""

    if hn_stories:
        for story in hn_stories[:5]:
            title = story.get("title", "N/A")
            score = story.get("score", 0)
            comments = story.get("descendants", 0)
            url = story.get("url", f"https://news.ycombinator.com/item?id={story.get('id')}")
            report += f"- **{title}** ({score} pts | {comments} comments) [链接]({url})\n"
    else:
        report += "*暂无数据*\n"

    report += """
---

## 💬 Reddit AI 社区热帖

"""

    if reddit_posts:
        for i, post in enumerate(reddit_posts[:5], 1):
            title = post.get("title", "N/A")
            score = post.get("score", 0)
            comments = post.get("comments", 0)
            subreddit = post.get("subreddit", "")
            url = post.get("url", post.get("permalink", ""))
            report += f"{i}. **[r/{subreddit}]** {title}\n   - 👍 {score} | 💬 {comments} | [链接]({url})\n\n"
    else:
        report += "*暂无数据*\n"

    report += """
---

## 📝 AI 博客 & 资讯

"""

    if ai_blogs:
        for item in ai_blogs[:5]:
            title = item.get("title", "N/A")
            source = item.get("source", "RSS")
            date = item.get("date", "")
            url = item.get("url", "")
            desc = item.get("description", "")[:100]
            report += f"- **[{source}]** {title} {f'({date})' if date else ''}\n  - {desc}... [链接]({url})\n\n"
    else:
        report += "*暂无数据*\n"

    report += """
---

## 🇨🇳 中文 AI 资讯 (36氪/CSDN)

"""

    if cn_news:
        for item in cn_news[:5]:
            title = item.get("title", "N/A")
            source = item.get("source", "")
            date = item.get("date", "")
            url = item.get("url", "")
            report += f"- **[{source}]** {title} {f'({date})' if date else ''} [链接]({url})\n"
    else:
        report += "*暂无数据*\n"

    report += f"""
---

## 📄 arXiv 最新 AI 论文 (cs.AI)

> 获取数量: {len(arxiv_papers)} 篇

"""

    if arxiv_papers:
        for i, paper in enumerate(arxiv_papers, 1):
            report += generate_paper_analysis(paper, i)

        report += generate_trend_analysis(arxiv_papers)
    else:
        report += """*无法获取 arXiv 数据*

---

"""

    report += """## 🛠️ 本周工具推荐

| 工具 | 类型 | 说明 |
|------|------|------|
| [Langflow](https://github.com/langflow-ai/langflow) | AI Agent 平台 | 可视化 AI 工作流 |
| [Dify](https://github.com/langgenius/dify) | AI 应用平台 | 开源 LLM 应用开发 |
| [Ollama](https://ollama.ai) | 本地 LLM | 轻松运行本地大模型 |
| [LiteLLM](https://github.com/BerriAI/litellm) | AI Gateway | 统一调用多种 LLM API |
| [n8n](https://github.com/n8n-io/n8n) | 工作流自动化 | AI 自动化工作流 |

---

## 📊 技术趋势

| 趋势 | 热度 | 说明 |
|------|------|------|
| AI Agent | 🔥 HIGH | 多智能体协作成为主流 |
| MCP 协议 | ⭐ MEDIUM | Anthropic 推出的模型上下文协议 |
| 本地 LLM | ⭐ MEDIUM | 隐私优先的本地部署方案 |
| AI Safety | ⭐ MEDIUM | AI 安全与对齐研究升温 |

---

*本日报由 AI Daily Report Generator v4.0 自动生成*
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

    print("[1/7] GitHub 热门仓库...")
    github_repos = fetch_github_repos()
    print(f"   [OK] 获取到 {len(github_repos)} 个仓库")

    print("[2/7] Hacker News AI 话题...")
    hn_stories = fetch_hacker_news_stories()
    print(f"   [OK] 获取到 {len(hn_stories)} 个话题")

    print("[3/7] Reddit AI 社区...")
    reddit_posts = fetch_reddit_posts()
    print(f"   [OK] 获取到 {len(reddit_posts)} 个帖子")

    print("[4/7] AI 博客 RSS...")
    ai_blogs = fetch_ai_blogs()
    print(f"   [OK] 获取到 {len(ai_blogs)} 篇博客")

    print("[5/7] 中文科技媒体...")
    cn_news = fetch_chinese_tech_news()
    print(f"   [OK] 获取到 {len(cn_news)} 条新闻")

    print("[6/7] arXiv 论文...")
    arxiv_papers = fetch_arxiv_papers()
    print(f"   [OK] 获取到 {len(arxiv_papers)} 篇论文")

    print("\n[INFO] 正在生成 Markdown 报告...")
    report = generate_report(date_str, github_repos, hn_stories, arxiv_papers, 
                            reddit_posts, ai_blogs, cn_news)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(report)

    print("=" * 50)
    print(f"[DONE] 日报已生成: {output_file}")
    print(f"\n[SUMMARY]")
    print(f"   - GitHub 仓库: {len(github_repos)} 个")
    print(f"   - HN 话题: {len(hn_stories)} 个")
    print(f"   - Reddit 帖子: {len(reddit_posts)} 个")
    print(f"   - AI 博客: {len(ai_blogs)} 篇")
    print(f"   - 中文资讯: {len(cn_news)} 条")
    print(f"   - arXiv 论文: {len(arxiv_papers)} 篇")


if __name__ == "__main__":
    main()
