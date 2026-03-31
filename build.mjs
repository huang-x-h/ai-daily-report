/**
 * 日报构建脚本 v3.4 - 修复表格链接
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const REPORTS_DIR = 'reports';
const OUTPUT_DIR = 'docs';

if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

// 处理单元格内的格式
function formatCell(text) {
    let result = text.trim();
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="hl">$1</strong>');
    result = result.replace(/`([^`]+)`/g, '<code class="code">$1</code>');
    return result;
}

// 解析单个 Markdown 表格
function parseTable(lines) {
    const dataLines = lines.filter(l => l.includes('|') && !/^\|[\s\-:|]+\|?$/.test(l.trim()));
    if (dataLines.length < 1) return '';
    
    let html = '<div class="table-wrapper"><table>';
    
    dataLines.forEach((line, idx) => {
        const cells = line.split('|').slice(1, -1).map(c => formatCell(c));
        
        if (idx === 0) {
            html += '<thead><tr>';
            cells.forEach(cell => html += `<th>${cell}</th>`);
            html += '</tr></thead><tbody>';
        } else {
            html += '<tr>';
            cells.forEach(cell => html += `<td>${cell}</td>`);
            html += '</tr>';
        }
    });
    
    html += '</tbody></table></div>';
    return html;
}

// Markdown 转 HTML
function markdownToHtml(md) {
    const lines = md.split('\n');
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        
        // 跳过引用
        if (line.trim().startsWith('>')) {
            i++;
            continue;
        }
        
        // 检测表格
        if (line.includes('|')) {
            const tableLines = [];
            while (i < lines.length && lines[i].includes('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            const validLines = tableLines.filter(l => !/^\|[\s\-:|]+\|?$/.test(l.trim()));
            if (validLines.length > 0) {
                result.push(parseTable(tableLines));
            }
            continue;
        }
        
        // 标题
        if (line.startsWith('#### ')) {
            result.push(`<h3 class="section-title">${line.slice(5)}</h3>`);
            i++;
            continue;
        }
        if (line.startsWith('### ')) {
            result.push(`<h3 class="section-title">${line.slice(4)}</h3>`);
            i++;
            continue;
        }
        if (line.startsWith('## ')) {
            result.push(`<h2 class="main-title">${line.slice(3)}</h2>`);
            i++;
            continue;
        }
        if (line.startsWith('# ')) {
            result.push(`<h1 class="page-title">${line.slice(2)}</h1>`);
            i++;
            continue;
        }
        
        // 水平线
        if (line.trim() === '---') {
            result.push('<div class="divider"></div>');
            i++;
            continue;
        }
        
        // 代码块
        if (line.startsWith('```')) {
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            result.push(`<pre class="code-block"><code>${codeLines.join('\n')}</code></pre>`);
            i++;
            continue;
        }
        
        // 列表
        if (/^[-*+]\s/.test(line.trim())) {
            const listItems = [];
            while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) {
                let item = lines[i].trim().slice(2);
                // 处理列表中的格式
                item = item.replace(/\*\*([^*]+)\*\*/g, '<strong class="hl">$1</strong>');
                item = item.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
                listItems.push(`<li>${item}</li>`);
                i++;
            }
            result.push(`<ul class="list-disc">${listItems.join('')}</ul>`);
            continue;
        }
        
        // 空行
        if (line.trim() === '') {
            i++;
            continue;
        }
        
        // 普通文本
        let text = line;
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="hl">$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/`([^`]+)`/g, '<code class="code">$1</code>');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        
        result.push(`<p>${text}</p>`);
        i++;
    }
    
    return result.join('\n');
}

// 生成日报页面
function generateReportPage(filename, content) {
    const date = basename(filename, '.md').replace('ai-daily-report-', '');
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 日报 - ${date}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --white: #ffffff;
            --bg2: #f8fafc;
            --text1: #1e293b;
            --text2: #64748b;
            --text3: #94a3b8;
            --border: #e2e8f0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); min-height: 100vh; color: var(--text1); line-height: 1.7; }
        .wrap { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
        
        .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .nav-brand { display: flex; align-items: center; gap: 10px; color: white; text-decoration: none; font-weight: 700; font-size: 20px; }
        .nav-btn { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 10px; text-decoration: none; color: white; font-weight: 500; backdrop-filter: blur(10px); transition: all 0.2s; }
        .nav-btn:hover { background: rgba(255,255,255,0.3); transform: translateX(-4px); }
        
        .card { background: var(--white); border-radius: 24px; padding: 48px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        
        .header { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid var(--border); }
        .title { font-size: 34px; font-weight: 800; background: var(--bg); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px; }
        .meta { display: flex; justify-content: center; gap: 24px; color: var(--text2); font-size: 14px; }
        .meta span { display: flex; align-items: center; gap: 6px; }
        
        .main-title { font-size: 22px; font-weight: 700; color: var(--text1); margin: 40px 0 20px; padding-bottom: 12px; border-bottom: 3px solid var(--primary); }
        .section-title { font-size: 17px; font-weight: 600; color: var(--text1); margin: 28px 0 14px; padding-left: 12px; border-left: 3px solid var(--primary); }
        
        .table-wrapper { overflow-x: auto; margin: 20px 0; border-radius: 12px; border: 1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        thead { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
        th { color: white; padding: 14px 12px; text-align: left; font-weight: 600; white-space: nowrap; }
        td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text2); }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: var(--bg2); }
        tbody tr:nth-child(even) { background: rgba(248,250,252,0.5); }
        
        a { color: var(--primary); text-decoration: none; }
        a:hover { color: var(--primary-dark); text-decoration: underline; }
        
        ul.list-disc { list-style: none; margin: 16px 0; }
        ul.list-disc li { position: relative; padding-left: 22px; margin-bottom: 10px; color: var(--text2); }
        ul.list-disc li::before { content: ''; position: absolute; left: 0; top: 9px; width: 6px; height: 6px; background: var(--primary); border-radius: 50%; }
        
        p { margin-bottom: 14px; color: var(--text2); }
        strong.hl { color: var(--primary); font-weight: 600; }
        
        code.code { background: var(--bg2); padding: 2px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #ec4899; }
        .code-block { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 12px; overflow-x: auto; margin: 20px 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
        
        .divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 36px 0; }
        
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); text-align: center; color: var(--text3); font-size: 13px; }
        .tags { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
        .tags span { background: var(--bg2); padding: 6px 14px; border-radius: 20px; font-size: 12px; }
        
        @media (max-width: 768px) {
            .wrap { padding: 20px 16px; }
            .card { padding: 24px; border-radius: 16px; }
            .title { font-size: 26px; }
            .meta { flex-wrap: wrap; gap: 12px; }
            th, td { padding: 10px 8px; font-size: 13px; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <nav class="nav">
            <a href="/" class="nav-brand"><span>📊</span> AI 日报</a>
            <a href="/" class="nav-btn">← 返回列表</a>
        </nav>
        
        <main class="card">
            <header class="header">
                <h1 class="title">AI 资源日报</h1>
                <div class="meta">
                    <span>📅 ${date}</span>
                    <span>•</span>
                    <span>🤖 自动生成</span>
                    <span>•</span>
                    <span>📡 GitHub + HN + arXiv</span>
                </div>
            </header>
            
            <article>${markdownToHtml(content)}</article>
            
            <footer class="footer">
                <p>🤖 本日报由 AI Daily Report Generator 自动生成</p>
                <div class="tags">
                    <span>🚀 Vercel</span>
                    <span>📊 GitHub</span>
                    <span>📚 arXiv</span>
                </div>
            </footer>
        </main>
    </div>
</body>
</html>`;
}

// 生成首页
function generateIndex(reports) {
    const list = reports.map(r => {
        const dateStr = r.date.replace('ai-daily-report-', '');
        const dateObj = new Date(dateStr);
        const fmt = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        return `<a href="/${r.filename}" class="card">
            <div class="inner">
                <div class="icon">📰</div>
                <div class="content">
                    <div class="date">${fmt}</div>
                    <div class="title">${r.title}</div>
                </div>
                <div class="arrow">→</div>
            </div>
        </a>`;
    }).join('');
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 日报</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #6366f1; --bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); min-height: 100vh; }
        .wrap { max-width: 800px; margin: 0 auto; padding: 60px 24px; }
        
        .hero { text-align: center; margin-bottom: 48px; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-bottom: 20px; backdrop-filter: blur(10px); }
        h1 { color: white; font-size: 48px; font-weight: 800; margin-bottom: 16px; text-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .desc { color: rgba(255,255,255,0.9); font-size: 18px; max-width: 480px; margin: 0 auto; line-height: 1.6; }
        
        .stats { display: flex; justify-content: center; gap: 40px; margin-top: 32px; }
        .stat { text-align: center; color: white; }
        .stat-val { font-size: 32px; font-weight: 700; }
        .stat-label { font-size: 13px; opacity: 0.8; margin-top: 4px; }
        
        .section { margin-top: 48px; }
        .section-title { color: white; font-size: 18px; font-weight: 600; margin-bottom: 20px; }
        
        .card { display: block; background: white; border-radius: 16px; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 16px; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
        .inner { display: flex; align-items: center; padding: 24px; gap: 16px; }
        .icon { font-size: 36px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: var(--bg); border-radius: 14px; }
        .content { flex: 1; }
        .date { color: var(--primary); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .title { color: #1e293b; font-size: 16px; font-weight: 600; line-height: 1.4; }
        .arrow { color: #94a3b8; font-size: 20px; transition: transform 0.3s, color 0.3s; }
        .card:hover .arrow { transform: translateX(6px); color: var(--primary); }
        
        .empty { text-align: center; padding: 60px 24px; background: rgba(255,255,255,0.1); border-radius: 16px; backdrop-filter: blur(10px); }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty h3 { color: white; font-size: 18px; margin-bottom: 8px; }
        .empty p { color: rgba(255,255,255,0.7); font-size: 14px; }
        
        .footer { text-align: center; margin-top: 60px; color: rgba(255,255,255,0.7); font-size: 14px; }
        .footer-tags { display: flex; justify-content: center; gap: 16px; margin-top: 16px; }
        .tag { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; font-size: 13px; }
        
        @media (max-width: 640px) {
            .wrap { padding: 40px 16px; }
            h1 { font-size: 32px; }
            .stats { gap: 24px; }
            .stat-val { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <header class="hero">
            <div class="badge"><span>🤖</span><span>每日 9:00 自动更新</span></div>
            <h1>AI 日报</h1>
            <p class="desc">每日汇总 GitHub 热门项目、Hacker News 热点和 arXiv 最新论文</p>
            <div class="stats">
                <div class="stat"><div class="stat-val">3</div><div class="stat-label">数据来源</div></div>
                <div class="stat"><div class="stat-val">${reports.length}</div><div class="stat-label">日报数量</div></div>
            </div>
        </header>
        
        <section class="section">
            <h2 class="section-title">📋 最新日报</h2>
            ${list || `<div class="empty"><div class="empty-icon">📭</div><h3>暂无日报</h3><p>将在每天 9:00 (北京时间) 自动生成</p></div>`}
        </section>
        
        <footer class="footer">
            <p>🤖 自动生成于每日 9:00 (北京时间)</p>
            <div class="footer-tags">
                <span class="tag">📊 GitHub</span>
                <span class="tag">📰 HN</span>
                <span class="tag">📚 arXiv</span>
                <span class="tag">🚀 Vercel</span>
            </div>
        </footer>
    </div>
</body>
</html>`;
}

function build() {
    console.log('🔨 构建日报站点...\n');
    
    if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
    
    let files = [];
    try {
        files = readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md')).sort().reverse();
    } catch {
        console.log('⚠️  reports/ 目录不存在');
        return { success: false, reports: [] };
    }
    
    console.log(`📄 找到 ${files.length} 个日报文件\n`);
    
    const reports = [];
    
    for (const file of files) {
        const content = readFileSync(join(REPORTS_DIR, file), 'utf-8');
        const filename = file.replace('.md', '.html');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : file;
        
        writeFileSync(join(OUTPUT_DIR, filename), generateReportPage(file, content));
        reports.push({ filename, date: file.replace('.md', ''), title });
        console.log(`  ✅ ${file}`);
    }
    
    writeFileSync(join(OUTPUT_DIR, 'index.html'), generateIndex(reports));
    console.log('\n  ✅ index.html 已更新');
    console.log('\n✨ 完成！');
    
    return { success: true, reports };
}

build();
export { build, markdownToHtml };
