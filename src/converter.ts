import { marked } from 'marked';
// @ts-ignore
import htmlPdf from 'html-pdf-node';
// @ts-ignore
import htmlDocx from 'html-docx-js';
import fs from 'fs/promises';

/**
 * GitHub-style CSS for professional resume/cover letter documents
 * Follows GitHub's markdown rendering standards
 */
const DOCUMENT_CSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #24292f;
  background-color: #ffffff;
  padding: 40px 50px;
  max-width: 100%;
}
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
h1 { 
  font-size: 18pt; 
  padding-bottom: 0.3em;
  border-bottom: 1px solid #d0d7de;
}
h2 { 
  font-size: 16pt;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #d0d7de;
}
h3 { 
  font-size: 14pt;
}
h4 { 
  font-size: 12pt;
}
h5, h6 { 
  font-size: 11pt;
}
p { 
  margin-top: 0; 
  margin-bottom: 16px; 
}
a { 
  color: #0969da; 
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
ul, ol { 
  padding-left: 2em; 
  margin-top: 0; 
  margin-bottom: 16px; 
}
li { 
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}
li > p {
  margin-bottom: 0.5em;
}
strong {
  font-weight: 600;
}
em {
  font-style: italic;
}
code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}
pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 16px;
}
pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}
hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #d0d7de;
  border: 0;
}
blockquote {
  padding: 0 1em;
  color: #57606a;
  border-left: 0.25em solid #d0d7de;
  margin-bottom: 16px;
}
table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
}
table th,
table td {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}
table th {
  font-weight: 600;
  background-color: #f6f8fa;
}
table tr {
  background-color: #ffffff;
  border-top: 1px solid #d0d7de;
}
table tr:nth-child(2n) {
  background-color: #f6f8fa;
}
@media print {
  body {
    padding: 0;
  }
}
`;

/**
 * Converts markdown content to HTML string
 */
async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown || typeof markdown !== 'string' || !markdown.trim()) {
    throw new Error('Markdown content is empty or invalid');
  }
  return await marked.parse(markdown, { breaks: true });
}

/**
 * Creates a complete HTML document from HTML content
 */
function wrapInHtmlDocument(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${DOCUMENT_CSS}</style>
</head>
<body>${htmlContent}</body>
</html>`;
}

/**
 * Converts markdown to PDF buffer using GitHub-style HTML rendering
 * This provides consistent, professional styling that matches GitHub's markdown
 */
export async function markdownToPdfBuffer(markdown: string): Promise<Buffer> {
  if (!markdown?.trim()) {
    throw new Error('Markdown content is empty');
  }

  // Convert markdown to HTML with GitHub styling
  const html = await markdownToHtml(markdown);
  const fullHtml = wrapInHtmlDocument(html);

  // Convert HTML to PDF using html-pdf-node
  const file = { content: fullHtml };
  const options = { 
    format: 'Letter',
    margin: {
      top: '0.75in',
      right: '0.75in',
      bottom: '0.75in',
      left: '0.75in'
    },
    printBackground: true,
    preferCSSPageSize: false
  };

  const pdfBuffer = await htmlPdf.generatePdf(file, options);
  return pdfBuffer;
}

/**
 * Converts markdown to DOCX buffer
 * Uses html-docx-js to generate a Word document
 */
export async function markdownToDocxBuffer(markdown: string): Promise<Buffer> {
  const html = await markdownToHtml(markdown);
  const fullHtml = wrapInHtmlDocument(html);
  
  // html-docx-js has inconsistent types, handle both asBuffer and asBlob
  const result = (htmlDocx as any).asBuffer 
    ? (htmlDocx as any).asBuffer(fullHtml) 
    : (htmlDocx as any).asBlob(fullHtml);
  
  if (Buffer.isBuffer(result)) {
    return result;
  }
  
  if (result?.arrayBuffer) {
    const arrayBuffer = await result.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  throw new Error('Failed to convert markdown to DOCX');
}

/**
 * Converts markdown to PDF file (writes to disk)
 * @deprecated Use markdownToPdfBuffer for server endpoints
 */
export async function convertMarkdownToPdf(markdown: string, outputPath: string): Promise<void> {
  const buffer = await markdownToPdfBuffer(markdown);
  await fs.writeFile(outputPath, buffer);
}

/**
 * Converts markdown to DOCX file (writes to disk)
 * @deprecated Use markdownToDocxBuffer for server endpoints
 */
export async function convertMarkdownToDocx(markdown: string, outputPath: string): Promise<void> {
  const buffer = await markdownToDocxBuffer(markdown);
  await fs.writeFile(outputPath, buffer);
}
