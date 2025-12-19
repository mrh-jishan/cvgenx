import { marked } from 'marked';
// @ts-ignore
import PDFDocument from 'pdfkit';
// @ts-ignore
import htmlDocx from 'html-docx-js';
import fs from 'fs/promises';

/**
 * Professional CSS styling for resume/cover letter documents
 */
const DOCUMENT_CSS = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #24292f;
  background-color: #ffffff;
  margin: 0;
  padding: 20px;
}
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
h3 { font-size: 1.25em; }
p { margin-top: 0; margin-bottom: 16px; }
a { color: #0969da; text-decoration: none; }
ul, ol { padding-left: 2em; margin-top: 0; margin-bottom: 16px; }
li { margin-top: 0.25em; }
code {
  padding: .2em .4em;
  margin: 0;
  font-size: 85%;
  background-color: #f6f8fa;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
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
 * Parse markdown tokens and render to PDF with proper formatting
 */
function renderMarkdownToPdf(doc: any, tokens: any[]): void {
  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        doc.moveDown(0.5);
        
        // Different sizes for different heading levels
        const headingSizes: Record<number, number> = {
          1: 20, 2: 18, 3: 16, 4: 14, 5: 12, 6: 11
        };
        const size = headingSizes[token.depth] || 14;
        
        doc.font('Helvetica-Bold').fontSize(size);
        
        // Render heading with inline tokens if available
        if (token.tokens && token.tokens.length > 0) {
          renderInlineTokens(doc, token.tokens);
          doc.text('', { continued: false });
        } else {
          doc.text(token.text, { continued: false });
        }
        
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(11);
        break;

      case 'paragraph':
        doc.font('Helvetica').fontSize(11);
        renderInlineContent(doc, token.tokens || []);
        doc.moveDown(0.5);
        break;

      case 'list':
        doc.moveDown(0.2);
        token.items.forEach((item: any, index: number) => {
          const bullet = token.ordered ? `${index + 1}. ` : '• ';
          doc.font('Helvetica').fontSize(11);
          doc.text(bullet, { continued: true, indent: 20 });
          
          // List items have a special structure: item.tokens contains parsed inline content
          if (item.tokens && item.tokens.length > 0) {
            // The first token is usually a 'text' type that contains the nested tokens
            item.tokens.forEach((subToken: any) => {
              if (subToken.type === 'text' && subToken.tokens) {
                // This is the actual inline content with bold, italic, links, etc.
                renderInlineTokens(doc, subToken.tokens);
              } else if (subToken.tokens) {
                renderInlineTokens(doc, subToken.tokens);
              } else if (subToken.type === 'text') {
                doc.text(subToken.text, { continued: true });
              }
            });
          } else if (item.text) {
            // Fallback to raw text if no tokens available
            doc.text(item.text, { continued: true });
          }
          
          doc.text('', { continued: false });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.3);
        break;

      case 'space':
        doc.moveDown(0.3);
        break;

      case 'hr':
        doc.moveDown(0.5);
        doc.strokeColor('#cccccc')
           .lineWidth(1)
           .moveTo(doc.x, doc.y)
           .lineTo(doc.page.width - doc.page.margins.right, doc.y)
           .stroke();
        doc.moveDown(0.5);
        break;

      default:
        // Handle other token types as plain text
        if ('text' in token) {
          doc.font('Helvetica').fontSize(11).text(token.text);
          doc.moveDown(0.3);
        }
    }
  }
}

/**
 * Render inline content (handles bold, italic, links, etc.)
 */
function renderInlineContent(doc: any, tokens: any[]): void {
  renderInlineTokens(doc, tokens);
  doc.text('', { continued: false }); // End the line
}

/**
 * Render inline tokens with proper formatting
 */
function renderInlineTokens(doc: any, tokens: any[]): void {
  for (const token of tokens) {
    if (token.type === 'text') {
      doc.font('Helvetica').text(token.text, { continued: true });
    } else if (token.type === 'strong') {
      doc.font('Helvetica-Bold');
      if (token.tokens) {
        renderInlineTokens(doc, token.tokens);
      } else {
        doc.text(token.text, { continued: true });
      }
      doc.font('Helvetica');
    } else if (token.type === 'em') {
      doc.font('Helvetica-Oblique');
      if (token.tokens) {
        renderInlineTokens(doc, token.tokens);
      } else {
        doc.text(token.text, { continued: true });
      }
      doc.font('Helvetica');
    } else if (token.type === 'link') {
      // Store current font to restore it after the link
      const currentFontName = doc._fontFamily || 'Helvetica';
      const currentFontSize = doc._fontSize || 11;
      
      doc.fillColor('#0969da')
         .text(token.text, { 
           continued: true,
           link: token.href,
           underline: true 
         });
      doc.fillColor('#000000').font(currentFontName).fontSize(currentFontSize);
    } else if (token.type === 'code' || token.type === 'codespan') {
      const currentSize = doc._fontSize || 11;
      doc.font('Courier')
         .fontSize(Math.max(currentSize - 1, 9))
         .text(token.text, { continued: true });
      doc.font('Helvetica').fontSize(currentSize);
    } else if ('tokens' in token && Array.isArray(token.tokens)) {
      renderInlineTokens(doc, token.tokens);
    } else if ('text' in token) {
      doc.text(token.text, { continued: true });
    }
  }
}

/**
 * Converts markdown to PDF buffer with proper formatting
 * Uses pdfkit to generate a professionally formatted PDF
 */
export async function markdownToPdfBuffer(markdown: string): Promise<Buffer> {
  if (!markdown?.trim()) {
    throw new Error('Markdown content is empty');
  }

  // Parse markdown into tokens
  const tokens = marked.lexer(markdown);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'LETTER',
      bufferPages: true
    });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Set default font and size
    doc.font('Helvetica').fontSize(11).fillColor('#000000');
    
    // Render the markdown tokens
    renderMarkdownToPdf(doc, tokens);
    
    doc.end();
  });
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
