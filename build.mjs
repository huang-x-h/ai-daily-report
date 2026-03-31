/**
 * 日报构建脚本 v2.0
 * 将 reports/ 目录下的 md 文件转换为静态HTML页面
 * 增强样式，支持表格显示
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

// 配置
const REPORTS_DIR = 'reports';
const OUTPUT_DIR = 'docs';

// 确保目录存在
if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
    console.log('✅ 已创建 reports/ 目录');
}

// 简单的 Markdown 转 HTML
function markdownToHtml(md) {
    let html = md;
    
    // 移除引用块标记
    html = html.replace(/^> /gm, '');
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 水平线
    html = html.replace(/^---$/gim, '<hr>');
    
    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 列表
    html = html.replace(/^(\-|\*|\+)\s+(.*$)/gim, '<li>$2</li>');
    html = html.replace(/^(\d+)\.\s+(.*$)/gim, '<li>$2</li>');
    // 合并连续的 li 为 ul
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return '<ul>' + match + '</ul>';
    });
    
    // 粗体和斜体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/___([^_]+)___/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // 表格处理
    html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    });
    // 识别表头 (第二行通常是 ---|---| )
    html = html.replace(/(<tr>.*<\/tr>\n)(<tr>(\s*[-:]+\s*)+\<\/tr>)/g, (m, header, separator) => {
        return header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    });
    // 合并表格行
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, (match) => {
        if (match.includes('<th>')) {
            return '<thead>' + match + '</thead><tbody>';
        }
        return match;
    });
    html = html.replace(/<\/thead><tbody>(<tr>.*<\/tr>\n?)*/g, (match) => {
        return match.replace(/<\/thead>/, '') + '</tbody>';
    });
    html = html.replace(/<\/tbody><\/thead><tbody>/g, '</tbody><tbody>');
    html = html.replace(/<thead>(<tr>.*<\/tr>)<\/thead><tbody>(.*?)<\/tbody>/gs, '<table>$1$2</tbody></table>');
    
    // 段落
    html = html.split('\n\n').map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.match(/^<(h[1-6]|ul|ol|pre|table|hr)/)) {
            return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    
    // 清理空表格行
    html = html.replace(/<tr>\s*<\/tr>/g, '');
    html = html.replace(/<td>\s*<\/td>/g, '<td>-</td>');
    
    return html;
}

// 生成单日报页面
function generateReportPage(filename, content) {
    const date = basename(filename, '.md');
    const htmlContent = markdownToHtml(content);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 日报 - ${date}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px 20px; line-height: 1.7; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; padding: 50px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 25px; border-bottom: 2px solid #eee; }
        .header-left h1 { color: #333; font-size: 28px; margin-bottom: 8px; }
        .header-left .subtitle { color: #666; font-size: 14px; }
        .back-link { background: #667eea; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; transition: all 0.3s; }
        .back-link:hover { background: #764ba2; transform: translateY(-2px); }
        
        h1 { color: #1a1a2e; font-size: 32px; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #667eea; }
        h2 { color: #333; margin: 35px 0 20px; font-size: 22px; padding-left: 15px; border-left: 4px solid #667eea; }
        h3 { color: #444; margin: 25px 0 15px; font-size: 18px; }
        
        p { margin-bottom: 15px; color: #444; }
        p > strong { color: #333; }
        
        /* 表格样式 */
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        thead { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        th { color: white; padding: 14px 12px; text-align: left; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #eee; color: #555; }
        tbody tr:hover { background: #f8f9ff; }
        tbody tr:nth-child(even) { background: #fafafa; }
        tbody tr:nth-child(even):hover { background: #f0f2ff; }
        
        /* 链接样式 */
        a { color: #667eea; text-decoration: none; transition: color 0.2s; }
        a:hover { color: #764ba2; text-decoration: underline; }
        
        /* 列表样式 */
        ul, ol { margin: 15px 0 20px 30px; }
        li { margin-bottom: 10px; color: #444; }
        
        /* 代码样式 */
        code { background: #f4f4f4; padding: 3px 8px; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; font-size: 13px; color: #e83e8c; }
        pre { background: #1a1a2e; color: #f8f8f2; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 20px 0; }
        pre code { background: none; color: inherit; padding: 0; font-size: 13px; }
        
        /* 分隔线 */
        hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, #ddd, transparent); margin: 30px 0; }
        
        /* 页脚 */
        .footer { margin-top: 50px; padding-top: 25px; border-top: 2px solid #eee; text-align: center; color: #999; font-size: 13px; }
        .footer span { margin: 0 10px; }
        
        /* 响应式 */
        @media (max-width: 768px) {
            .container { padding: 25px; }
            .header { flex-direction: column; gap: 20px; text-align: center; }
            h1 { font-size: 24px; }
            table { font-size: 12px; }
            th, td { padding: 10px 8px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <h1>📊 AI 日报</h1>
                <div class="subtitle">📅 ${date}</div>
            </div>
            <a href="/" class="back-link">← 返回列表</a>
        </div>
        <article>
            ${htmlContent}
        </article>
        <div class="footer">
            <span>🤖 自动生成</span>
            <span>•</span>
            <span>📡 GitHub API + Hacker News + arXiv</span>
            <span>•</span>
            <span>🚀 Vercel 托管</span>
        </div>
    </div>
</body>
</html>`;
}

// 生成首页
function generateIndex(reports) {
    const reportsList = reports.map(r => `
        <li class="report-item">
            <a href="/${r.filename}">
                <div class="report-icon">📰</div>
                <div class="report-content">
                    <div class="report-date">${r.date}</div>
                    <div class="report-title">${r.title}</div>
                </div>
                <div class="report-arrow">→</div>
            </a>
        </li>
    `).join('\n');
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 日报列表</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 60px 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .hero { text-align: center; margin-bottom: 50px; }
        .hero h1 { color: white; font-size: 42px; margin-bottom: 15px; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        .hero p { color: rgba(255,255,255,0.9); font-size: 18px; }
        .reports { list-style: none; }
        .report-item { background: white; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); transition: all 0.3s; }
        .report-item:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
        .report-item a { display: flex; align-items: center; padding: 24px 28px; text-decoration: none; color: #333; }
        .report-icon { font-size: 36px; margin-right: 20px; }
        .report-content { flex: 1; }
        .report-date { color: #667eea; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
        .report-title { font-size: 18px; font-weight: 500; color: #333; }
        .report-arrow { color: #999; font-size: 20px; transition: transform 0.3s; }
        .report-item:hover .report-arrow { transform: translateX(5px); color: #667eea; }
        .footer { text-align: center; margin-top: 50px; color: rgba(255,255,255,0.7); font-size: 14px; }
        @media (max-width: 768px) {
            .hero h1 { font-size: 28px; }
            .report-item a { padding: 20px; }
            .report-icon { font-size: 28px; margin-right: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>📊 AI 日报</h1>
            <p>每日自动汇总 GitHub 热门项目、Hacker News 话题和 arXiv 最新论文</p>
        </div>
        <ul class="reports">
            ${reportsList || '<li class="report-item"><a href="#"><p>暂无日报</p></a></li>'}
        </ul>
        <div class="footer">
            <p>🤖 自动生成于每日 9:00 (北京时间)</p>
            <p style="margin-top: 8px;">📡 数据来源: GitHub API • Hacker News API • arXiv API</p>
        </div>
    </div>
</body>
</html>`;
}

// 主构建流程
function build() {
    console.log('🔨 开始构建日报站点...\n');
    
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    let files = [];
    try {
        files = readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md')).sort().reverse();
    } catch {
        console.log('⚠️  reports/ 目录不存在，跳过构建');
        return { success: false, reports: [] };
    }
    
    console.log(`📄 找到 ${files.length} 个日报文件\n`);
    
    const reports = [];
    
    for (const file of files) {
        const filepath = join(REPORTS_DIR, file);
        const content = readFileSync(filepath, 'utf-8');
        const filename = file.replace('.md', '.html');
        
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
        const date = file.replace('.md', '');
        
        const html = generateReportPage(file, content);
        writeFileSync(join(OUTPUT_DIR, filename), html);
        
        reports.push({ filename, date, title });
        console.log(`  ✅ ${file} → ${filename}`);
    }
    
    const indexHtml = generateIndex(reports);
    writeFileSync(join(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log('\n  ✅ index.html 已更新');
    console.log('\n✨ 构建完成！');
    
    return { success: true, reports };
}

build();

export { build, markdownToHtml };
