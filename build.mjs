/**
 * 日报构建脚本
 * 将 reports/ 目录下的 md 文件转换为静态HTML页面
 * 并更新 index.html 的日报列表
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

// 配置
const REPORTS_DIR = 'reports';
const OUTPUT_DIR = 'docs';

// 确保目录存在
if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
    console.log('✅ 已创建 reports/ 目录，请将日报md文件放入其中');
}

// 简单的 Markdown 转 HTML（支持基础语法）
function markdownToHtml(md) {
    let html = md;
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 列表
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 粗体和斜体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 段落
    html = html.split('\n\n').map(p => {
        if (!p.match(/^<(h[1-6]|ul|pre|ol)/)) {
            return `<p>${p}</p>`;
        }
        return p;
    }).join('\n');
    
    // 换行
    html = html.replace(/\n/g, '<br>');
    
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
    <title>日报 - ${date}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 40px 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .date { color: #666; font-size: 14px; }
        .back-link { color: #0070f3; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        h1 { color: #333; margin-bottom: 20px; }
        h2, h3 { color: #444; margin: 20px 0 10px; }
        p { margin-bottom: 15px; color: #333; }
        ul { margin: 15px 0 15px 30px; }
        li { margin-bottom: 8px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; margin: 15px 0; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; }
        a { color: #0070f3; }
        strong { font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="date">📅 ${date}</span>
            <a href="/" class="back-link">← 返回列表</a>
        </div>
        <article>
            ${htmlContent}
        </article>
    </div>
</body>
</html>`;
}

// 生成首页
function generateIndex(reports) {
    const reportsList = reports.map(r => `
        <li class="report-item">
            <a href="/${r.filename}">
                <div class="report-date">📅 ${r.date}</div>
                <div class="report-title">${r.title}</div>
            </a>
        </li>
    `).join('\n');
    
    const template = readFileSync(join(OUTPUT_DIR, 'index.html'), 'utf-8');
    return template.replace('<!-- 日报内容将由构建脚本生成 -->', reportsList);
}

// 主构建流程
function build() {
    console.log('🔨 开始构建日报站点...\n');
    
    // 确保输出目录存在
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // 读取所有 md 文件
    let files = [];
    try {
        files = readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md'));
    } catch {
        console.log('⚠️  reports/ 目录不存在，跳过构建');
        return;
    }
    
    console.log(`📄 找到 ${files.length} 个日报文件\n`);
    
    const reports = [];
    
    // 生成每个日报页面
    for (const file of files) {
        const filepath = join(REPORTS_DIR, file);
        const content = readFileSync(filepath, 'utf-8');
        const filename = file.replace('.md', '.html');
        
        // 提取标题（第一个 # 后的内容）
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
        const date = file.replace('.md', '');
        
        // 生成页面
        const html = generateReportPage(file, content);
        writeFileSync(join(OUTPUT_DIR, filename), html);
        
        reports.push({ filename, date, title });
        console.log(`  ✅ ${file} → ${filename}`);
    }
    
    // 生成首页
    const indexHtml = generateIndex(reports);
    writeFileSync(join(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log('\n  ✅ index.html 已更新');
    
    console.log('\n✨ 构建完成！\n');
}

// 自动构建（监听文件变化时使用）
build();

// 导出供 API 调用
export { build, markdownToHtml };
