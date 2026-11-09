/* PDF.js 6.5.438, Apache-2.0. Extraction runs locally in the browser. */
(function(root) {
  'use strict';
  let library;
  function pageLines(items, detailed) {
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
    const cleaned = lines.map(function(value) { value.text = value.text.normalize('NFKC').trim(); return value; }).filter(function(value) { return value.text; });
    return detailed ? cleaned : cleaned.map(function(value) { return value.text; });
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
      const pageHeights = [];
      for (let number = 1; number <= document.numPages; number++) {
        if (onProgress) onProgress(number, document.numPages);
        const page = await document.getPage(number);
        pages.push(pageLines((await page.getTextContent()).items, true));
        pageHeights.push(page.getViewport({ scale: 1 }).height);
        page.cleanup();
      }
      const allHeights = pages.flat().map(function(line) { return line.height; }).sort(function(a, b) { return a - b; });
      const proseHeights = pages.flat().filter(function(line) { return line.text.length >= 30; }).map(function(line) { return line.height; }).sort(function(a, b) { return a - b; });
      const bodyHeight = proseHeights.length ? proseHeights[Math.floor(proseHeights.length / 2)] : allHeights[Math.floor(allHeights.length / 4)] || 12;
      const first = (pages[0] || []).slice(0, 12);
      const firstChapter = first.findIndex(function(line) { return /^(?:chapter|챕터|제?\s*\d+\s*[장화편])/i.test(line.text); });
      const titleLine = (firstChapter >= 0 ? first.slice(0, firstChapter) : first).find(function(line) {
        return line.height >= bodyHeight * 1.3 && line.text.length < 160 &&
          !/^(?:chapter|챕터|제?\s*\d+\s*[장화편]|\d+$|by\b|저자|작가)/i.test(line.text);
      });
      // Repeated text is a margin only when its position is near a page edge.
      const margins = new Map();
      pages.forEach(function(lines, index) {
        new Set(lines.filter(function(line) { return line.y > pageHeights[index] * 0.92 || line.y < pageHeights[index] * 0.08; }).map(function(line) { return line.text; })).forEach(function(text) { margins.set(text, (margins.get(text) || 0) + 1); });
      });
      const text = pages.map(function(lines, pageIndex) {
        const out = [];
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          const marginal = line.y > pageHeights[pageIndex] * 0.92 || line.y < pageHeights[pageIndex] * 0.08;
          if (line === titleLine) { out.push('제목: ' + line.text); continue; }
          if (marginal && /^(?:page\s*)?\d+(?:\s*(?:\/|of)\s*\d+)?$/i.test(line.text)) continue;
          if (marginal && pages.length >= 3 && margins.get(line.text) >= Math.max(3, Math.ceil(pages.length * 0.6)) &&
              !/^(?:#|chapter\b|챕터|제?\s*\d+\s*[장화편]|제목|저자|작가)/i.test(line.text)) continue;
          let heading = line.text;
          if (/^(?:chapter|chap\.?|챕터)$/i.test(heading) && lines[index + 1] && /^\d+$/.test(lines[index + 1].text)) {
            heading += ' ' + lines[++index].text;
          }
          // A subtitle on its own larger-font line belongs to the chapter heading.
          if (/^(?:(?:chapter|chap\.?|챕터)\s*\d+|제?\s*\d+\s*[장화편])\s*[:：.\-]?$/i.test(heading) && lines[index + 1] &&
              lines[index + 1].height > bodyHeight * 1.15 && lines[index + 1].text.length < 120 &&
              !/^(?:chapter|챕터|제?\s*\d+\s*[장화편])/i.test(lines[index + 1].text)) {
            heading += ': ' + lines[++index].text;
          }
          out.push(heading);
        }
        return out.join('\n');
      }).join('\n\n');
      if (!text.trim()) throw new Error('텍스트가 없는 스캔 PDF입니다. 텍스트를 선택할 수 있는 PDF나 TXT 파일로 올려 주세요.');
      const parsed = root.TranslationImport.parseText(text, file.name);
      const body = parsed.chapters.flatMap(function(chapter) { return chapter.paragraphs; }).join(' ');
      const letters = (body.match(/\p{L}/gu) || []).length;
      const broken = (body.match(/\uFFFD|\(cid:\d+\)/g) || []).length;
      if (!letters || broken > Math.max(3, letters * 0.1)) throw new Error('PDF 본문 글자를 정상적으로 읽지 못했습니다. PDF에서 본문을 복사할 수 있는지 확인하고, 복사한 텍스트나 TXT로 올려 주세요.');
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
