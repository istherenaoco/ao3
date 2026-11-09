/* PDF.js 6.5.438, Apache-2.0. Extraction runs locally in the browser. */
(function(root) {
  'use strict';
  let library;
  function pageLines(items) {
    const lines = [];
    let line = null;
    for (const item of items) {
      if (typeof item.str !== 'string') continue;
      const y = item.transform[5], x = item.transform[4];
      const height = Math.abs(item.height || item.transform[3]) || 12;
      if (!line || Math.abs(line.y - y) > Math.max(2, height * 0.35)) {
        line = { text: '', y: y, end: x, height: height }; lines.push(line);
      }
      const gap = x - line.end;
      if (line.text && gap > height * 0.15 && !/\s$/.test(line.text) && !/^\s/.test(item.str)) line.text += ' ';
      line.text += item.str;
      line.end = x + (item.width || 0);
      if (item.hasEOL) line = null;
    }
    return lines.map(function(value) { return value.text.trim(); }).filter(Boolean);
  }
  async function read(file, onProgress) {
    library = library || import('/assets/vendor/pdfjs/pdf.min.mjs');
    const pdfjs = await library;
    pdfjs.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: '/assets/vendor/pdfjs/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/assets/vendor/pdfjs/standard_fonts/',
      isEvalSupported: false
    });
    task.onPassword = function() { task.destroy(); };
    let document;
    try {
      document = await task.promise;
      const pages = [];
      for (let number = 1; number <= document.numPages; number++) {
        if (onProgress) onProgress(number, document.numPages);
        const page = await document.getPage(number);
        pages.push(pageLines((await page.getTextContent()).items));
        page.cleanup();
      }
      // Omit only repeated marginal lines, never chapter markers or metadata.
      const margins = new Map();
      pages.forEach(function(lines) {
        new Set([lines[0], lines[lines.length - 1]].filter(Boolean)).forEach(function(text) {
          margins.set(text, (margins.get(text) || 0) + 1);
        });
      });
      const text = pages.map(function(lines) {
        return lines.filter(function(line, index) {
          if (index !== 0 && index !== lines.length - 1) return true;
          if (/^(?:page\s*)?\d+(?:\s*(?:\/|of)\s*\d+)?$/i.test(line)) return false;
          if (/^(?:#|chapter\b|챕터|제?\s*\d+\s*[장화편]|제목\s*[:：]|저자\s*[:：]|작가\s*[:：])/i.test(line)) return true;
          return pages.length < 3 || margins.get(line) < Math.max(3, Math.ceil(pages.length * 0.6));
        }).join('\n');
      }).join('\n\n');
      if (!text.trim()) throw new Error('텍스트가 없는 스캔 PDF입니다. 텍스트를 선택할 수 있는 PDF나 TXT 파일로 올려 주세요.');
      const parsed = root.TranslationImport.parseText(text, file.name);
      const metadata = await document.getMetadata().catch(function() { return null; });
      const info = metadata && metadata.info || {};
      const useful = function(value) { return typeof value === 'string' && value.trim() && !/^(?:untitled|anonymous|unknown|unspecified)$/i.test(value.trim()); };
      if (parsed.meta.title === file.name.replace(/\.[^.]+$/, '') && useful(info.Title)) parsed.meta.title = info.Title.trim();
      if (!parsed.meta.author && useful(info.Author)) parsed.meta.author = info.Author.trim();
      return parsed;
    } catch (error) {
      if (error.name === 'PasswordException' || /password|destroyed/i.test(error.message || '')) throw new Error('암호로 보호된 PDF는 암호를 해제한 뒤 올려 주세요.');
      throw error;
    } finally {
      await task.destroy();
    }
  }
  root.PdfTranslationImport = { read: read, pageLines: pageLines };
})(window);
