/* Finished translations only: no provider requests and no language guessing. */
(function(root) {
  'use strict';
  function parseTranslationText(input, filename) {
    const meta = { title: '', author: '', sourceUrl: '' };
    const chapters = [];
    let current = { title: '', paragraphs: [] }, inNotes = false, inBody = false;
    const flush = function() {
      if (current.paragraphs.length) chapters.push(current);
      current = { title: '', paragraphs: [] };
    };
    const lines = String(input || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || /^```(?:\w+)?$/.test(line) || /^(?:---+|___+)$/.test(line)) continue;
      const heading = line.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
      const field = heading.match(/^(제목|작품명|title|작가|저자|author|by|원문(?:\s*URL)?|출처|source(?:\s*URL)?)\s*[:：]\s*(.+)$/i);
      if (field && !inBody) {
        const key = /^(제목|작품명|title)$/i.test(field[1]) ? 'title' : /^(작가|저자|author|by)$/i.test(field[1]) ? 'author' : 'sourceUrl';
        meta[key] = field[2].replace(/^\*\*|\*\*$/g, '').trim();
        continue;
      }
      const chapter = heading.match(/^(?:(?:chapter|chap\.?|챕터)\s*(\d+)|제?\s*(\d+)\s*[장화편])(?:\s*[:：.\-–—]\s*|\s+)?(.*)$/i);
      if (chapter) {
        flush(); current.title = heading; current.number = Number(chapter[1] || chapter[2]);
        inNotes = false; inBody = true; continue;
      }
      const note = heading.match(/^(?:작가(?:의)?\s*(?:노트|말|후기)|역자(?:의)?\s*(?:노트|말|후기)|번역자(?:의)?\s*(?:노트|말|후기)|챕터\s*노트|후기|주석|author[’']?s?\s*notes?|chapter\s*notes?|end\s*notes?|notes?)\s*(?:[:：].*)?$/i);
      if (note) { inNotes = true; continue; }
      if (/^(?:본문|번역문|번역본|본편|chapter\s*text|work\s*text|story)\s*[:：]?$/i.test(heading)) { inNotes = false; inBody = true; continue; }
      if (inNotes) continue;
      if (!inBody && /^#\s+/.test(line) && !meta.title) { meta.title = heading; continue; }
      if (!inBody && /^by\s+\S/i.test(heading)) { meta.author = heading.replace(/^by\s+/i, ''); continue; }
      current.paragraphs.push(line); // Preserve prose verbatim, including quotes and scene dividers.
    }
    flush();
    meta.title = meta.title || String(filename || '').replace(/\.[^.]+$/, '') || '번역 소설';
    chapters.forEach(function(ch, i) { ch.title = ch.title || 'Chapter ' + (i + 1); });
    return { meta: meta, chapters: chapters };
  }
  function parseTranslation(input, filename) {
    if (!/\.(?:html?|xhtml)$/i.test(filename || '') && !/<(?:!doctype|html|body|article|div|p|h[1-6])(?:\s|>)/i.test(input)) return parseTranslationText(input, filename);
    const doc = new DOMParser().parseFromString(input, 'text/html');
    doc.querySelectorAll('script,style,nav,footer,.notes,.end.notes,.preface .summary,.afterword').forEach(function(node) { node.remove(); });
    const title = doc.querySelector('h2.title,h1.title,h1');
    const author = doc.querySelector('a[rel="author"],.byline');
    const source = Array.from(doc.querySelectorAll('a[href]')).find(function(a) { return /^https?:\/\/(?:www\.)?archiveofourown\.org\/works\/\d+/.test(a.getAttribute('href')); });
    const blocks = Array.from(doc.querySelectorAll('#chapters .chapter'));
    const bodies = blocks.length ? blocks : Array.from(doc.querySelectorAll('#chapters > .userstuff,article'));
    let parsed;
    if (bodies.length) {
      parsed = { meta: {}, chapters: bodies.map(function(block, i) {
        const body = block.querySelector('.userstuff') || block;
        const heading = block.querySelector('h3.title,h2.title,h2,h3');
        const copy = body.cloneNode(true);
        copy.querySelectorAll('h2.title,h3.title,.heading,.notes').forEach(function(node) { node.remove(); });
        copy.querySelectorAll('br').forEach(function(node) { node.replaceWith('\n'); });
        const paragraphs = Array.from(copy.querySelectorAll('p')).map(function(p) { return p.textContent.trim(); }).filter(Boolean);
        return { title: heading ? heading.textContent.trim() : 'Chapter ' + (i + 1), paragraphs: paragraphs.length ? paragraphs : [copy.textContent.trim()].filter(Boolean) };
      }).filter(function(ch) { return ch.paragraphs.length; }) };
    } else {
      doc.querySelectorAll('br').forEach(function(node) { node.replaceWith('\n'); });
      doc.querySelectorAll('p,div,h1,h2,h3,h4,section').forEach(function(node) { node.append('\n'); });
      parsed = parseTranslationText(doc.body.textContent, filename);
    }
    parsed.meta.title = title && title.textContent.trim() || parsed.meta.title || String(filename || '').replace(/\.[^.]+$/, '') || '번역 소설';
    parsed.meta.author = author && author.textContent.trim().replace(/^by\s+/i, '') || parsed.meta.author || '';
    parsed.meta.sourceUrl = source && source.getAttribute('href') || parsed.meta.sourceUrl || '';
    return parsed;
  }
  root.TranslationImport = { parse: parseTranslation, parseText: parseTranslationText };
})(typeof window === 'undefined' ? globalThis : window);
