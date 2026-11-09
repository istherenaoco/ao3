(function(root) {
  'use strict';
  // Decode only JSON data. Shared page scripts are never executed.
  function unflatten(table) {
    const cache = new Map(); let visits = 0;
    function at(index, depth) {
      if (!Number.isInteger(index) || index < 0 || index >= table.length || depth > 100 || ++visits > 100000) return null;
      if (cache.has(index)) return cache.get(index);
      const value = table[index];
      if (value === null || typeof value !== 'object') return value;
      const result = Array.isArray(value) ? [] : Object.create(null);
      cache.set(index, result);
      for (const [key, item] of Object.entries(value)) {
        const name = /^_\d+$/.test(key) ? at(Number(key.slice(1)), depth + 1) : key;
        if (typeof name !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(name)) continue;
        result[name] = typeof item === 'number' ? at(item, depth + 1) : item;
      }
      return result;
    }
    return at(0, 0);
  }
  function decodeMobile(value, depth) {
    depth = depth || 0;
    if (depth > 100 || !value || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      if (value.length === 2 && value[0] === 'object' && Array.isArray(value[1])) {
        const result = Object.create(null);
        value[1].forEach(function(entry) {
          if (Array.isArray(entry) && typeof entry[0] === 'string' && !['__proto__','constructor','prototype'].includes(entry[0])) result[entry[0]] = decodeMobile(entry[1], depth + 1);
        });
        return result;
      }
      if (value.length === 2 && value[0] === 'array' && Array.isArray(value[1])) return value[1].map(function(item) { return decodeMobile(item, depth + 1); });
      if (value.length === 2 && ['string','number','boolean'].includes(value[0])) return value[1];
      return value.map(function(item) { return decodeMobile(item, depth + 1); });
    }
    const result = Object.create(null);
    Object.keys(value).forEach(function(key) { if (!['__proto__','constructor','prototype'].includes(key)) result[key] = decodeMobile(value[key], depth + 1); });
    return result;
  }
  function collect(data) {
    const messages = [], seen = new Set(), ids = new Set();
    function walk(value, depth) {
      if (!value || typeof value !== 'object' || seen.has(value) || depth > 100 || seen.size > 50000) return;
      seen.add(value);
      const message = value.message || value;
      const role = message.author && message.author.role || message.role;
      if (typeof role === 'string' && message.content) {
        const parts = message.content.parts;
        const text = typeof message.content === 'string' ? message.content : Array.isArray(parts) ? parts.filter(function(p) { return typeof p === 'string'; }).join('\n\n') : '';
        const id = message.id || message;
        if (text && !ids.has(id)) { ids.add(id); messages.push({ id: message.id, role: role, text: text, channel: message.channel, recipient: message.recipient, metadata: message.metadata || {} }); }
        return;
      }
      for (const item of Object.values(value)) walk(item, depth + 1);
    }
    // Mapping insertion order can contain abandoned branches. Follow current_node when available.
    function conversation(value, depth, visited) {
      if (!value || typeof value !== 'object' || depth > 40 || visited.has(value)) return false;
      visited.add(value);
      if (Array.isArray(value.linear_conversation)) { value.linear_conversation.forEach(function(node) { walk(node, 0); }); return true; }
      if (value.mapping && value.current_node && value.mapping[value.current_node]) {
        const chain = [], nodes = new Set(); let node = value.mapping[value.current_node];
        while (node && !nodes.has(node)) { nodes.add(node); chain.unshift(node); node = value.mapping[node.parent]; }
        chain.forEach(function(node) { walk(node, 0); }); return true;
      }
      for (const item of Object.values(value)) if (conversation(item, depth + 1, visited)) return true;
      return false;
    }
    if (!conversation(data, 0, new Set())) walk(data, 0);
    const present = new Set(messages.map(function(m) { return m.id; }));
    const mergedSources = new Set();
    messages.forEach(function(m) {
      if (m.metadata.is_merged_message) (m.metadata.source_message_ids || []).forEach(function(id) { mergedSources.add(id); });
    });
    return messages.filter(function(m) {
      if (m.role !== 'assistant') return m.role === 'user';
      if (m.channel && m.channel !== 'final') return false;
      if (m.recipient && m.recipient !== 'all') return false;
      if (m.text.trim() === 'The output of this plugin was redacted.') return false;
      if (mergedSources.has(m.id) || (m.metadata.is_message_fragment && present.has(m.metadata.merged_message_id))) return false;
      return !m.metadata.is_visually_hidden_from_conversation;
    });
  }
  function cleanAnswer(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const chapterPattern = /^(?:(?:chapter|chap\.?|챕터)\s*(\d+)|제?\s*(\d+)\s*[장화편])(?:\s*[:：.\-–—]\s*|\s+|$)/i;
    const plain = function(line) { return line.trim().replace(/<[^>]+>/g, '').replace(/^#{1,6}\s+/, '').replace(/^[*_]+|[*_]+$/g, '').trim(); };
    let number = null, hasBody = false, skipSummary = false;
    const divider = lines.findIndex(function(line, index) { return index < 12 && line.trim() === '---'; });
    const bodyMarker = lines.findIndex(function(line, index) { return index < 120 && /^(?:본문|번역문|본편|chapter text|work text)\s*[:：]?$/i.test(plain(line)); });
    const frontMatterEnd = bodyMarker >= 0 ? bodyMarker : divider;
    const out = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index], heading = plain(line);
      if (/^(?:챕터|chapter)\s*\d+\s*(?:본문\s*)?(?:끝|end)[.!]?$/i.test(heading)) break;
      if (/^(?:※\s*)?(?:작가|역자|번역자).*후기.*(?:생략|포함하지|제외)/u.test(heading)) continue;
      const chapter = heading.match(chapterPattern);
      if (chapter) {
        const next = Number(chapter[1] || chapter[2]);
        if (number === next && !hasBody) continue; // English/Korean pair is one heading.
        number = next; hasBody = false; skipSummary = false;
        out.push('# ' + heading); continue;
      }
      if (/^(?:If you want,? I can\s*:|원하시면.*(?:드릴|할|해드릴).*[:：])$/i.test(heading) && lines.slice(index + 1, index + 5).some(function(next) { return /^\s*[-*]\s+/.test(next); })) break;
      if (/^(?:다음 (?:부분|답변)에서 이어집니다[.!]?|계속됩니다[.!]?)$/u.test(heading)) continue;
      if (index < frontMatterEnd) {
        if (/^#\s+/.test(line) || /^(?:제목|작품명|title|작가|저자|author|원문|출처|source)\s*[:：]/i.test(heading)) out.push(line);
        continue;
      }
      if (/^(?:챕터\s*요약|chapter\s*summary|summary)\s*[:：]?$/i.test(heading)) { skipSummary = true; continue; }
      if (skipSummary) { if (heading) { skipSummary = false; } continue; }
      if (!hasBody && /^\*[^*].*\*$/.test(line.trim()) && heading.length < 120) continue;
      if (/^(?:원문의 서술 시점|아래는 .*번역|다음은 .*번역)/.test(heading)) continue;
      if (/^(?:다음 (?:부분|챕터)도|더 필요한 부분이|추가로 번역할)/.test(heading)) continue;
      if (/^(?:작가(?:의)?\s*(?:노트|후기)|챕터\s*노트|author.?s?\s*notes?|end\s*notes?)\s*[:：]?$/i.test(heading)) { out.push('후기'); continue; }
      out.push(line);
      if (heading && !/^[-_*]{3,}$/.test(heading) && !/^#/.test(line)) hasBody = true;
    }
    return out.join('\n');
  }
  function parse(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let messages = [];
    for (const script of doc.querySelectorAll('script')) {
      const text = script.textContent || '';
      const candidates = [];
      if (script.type === 'application/json' || script.id === '__NEXT_DATA__') {
        try { const data = JSON.parse(text); candidates.push(script.hasAttribute('data-octane-native-signals') || script.hasAttribute('data-octane-suspense-signals') ? decodeMobile(data) : data); } catch (ignore) {}
      }
      const pattern = /streamController\.enqueue\(\s*("(?:[^"\\]|\\.)*")\s*\)/g;
      let match;
      while ((match = pattern.exec(text))) {
        try {
          const value = JSON.parse(JSON.parse(match[1]));
          candidates.push(Array.isArray(value) ? unflatten(value) : value);
        } catch (ignore) {}
      }
      for (const candidate of candidates) {
        const found = collect(candidate);
        if (found.filter(function(m) { return m.role === 'assistant'; }).length > messages.filter(function(m) { return m.role === 'assistant'; }).length) messages = found;
      }
    }
    if (!messages.some(function(m) { return m.role === 'assistant'; })) {
      messages = Array.from(doc.querySelectorAll('[data-message-author-role], [data-assistant-markdown-root]')).filter(function(node) { return !node.parentElement.closest('[data-message-author-role], [data-assistant-markdown-root]'); }).map(function(node) {
        const copy = node.cloneNode(true);
        copy.querySelectorAll('button,nav,script,style').forEach(function(n) { n.remove(); });
        copy.querySelectorAll('h1,h2,h3,h4').forEach(function(n) { n.prepend('#'.repeat(Number(n.tagName.slice(1))) + ' '); });
        copy.querySelectorAll('p,div,h1,h2,h3,h4,br,li').forEach(function(n) { n.append('\n'); });
        return { role: node.getAttribute('data-message-author-role') || 'assistant', text: copy.textContent.trim() };
      });
    }
    const assistant = messages.filter(function(m) { return m.role === 'assistant'; });
    if (!assistant.length) throw new Error('공유 페이지에서 답변 본문을 찾지 못했습니다. 공개 상태를 확인하거나 번역문을 붙여넣어 주세요.');
    const chapters = [], meta = { title: '', author: '', sourceUrl: '' };
    const fallback = '번역 소설';
    for (const message of assistant) {
      const cleaned = cleanAnswer(message.text);
      const parsed = root.TranslationImport.parseText(cleaned, '');
      if (!meta.title && parsed.meta.title !== fallback) meta.title = parsed.meta.title;
      if (!meta.author) meta.author = parsed.meta.author;
      if (!meta.sourceUrl) meta.sourceUrl = parsed.meta.sourceUrl;
      for (const chapter of parsed.chapters) {
        const previous = chapters[chapters.length - 1];
        if (previous && (!chapter.number || chapter.number === previous.number)) {
          previous.paragraphs.push.apply(previous.paragraphs, chapter.paragraphs);
        } else {
          if (!chapter.number && chapter.title === 'Chapter 1') chapter.title = 'Chapter ' + (chapters.length + 1);
          chapters.push(chapter);
        }
      }
    }
    // User prompts may supply metadata; their original text never becomes story paragraphs.
    for (const message of messages.filter(function(m) { return m.role === 'user'; })) {
      const labels = message.text.split('\n').filter(function(line) { return /^(?:제목|작품명|title|작가|저자|author|원문(?:\s*URL)?|출처|source(?:\s*URL)?)\s*[:：]/i.test(line.trim()); }).join('\n');
      const parsed = root.TranslationImport.parseText(labels, '').meta;
      if (!meta.title && parsed.title !== fallback) meta.title = parsed.title;
      if (!meta.author) meta.author = parsed.author;
      if (!meta.sourceUrl) meta.sourceUrl = parsed.sourceUrl;
    }
    if (!chapters.length) throw new Error('저장할 번역 본문을 찾지 못했습니다.');
    const pageTitle = (doc.querySelector('meta[property="og:title"]') || {}).content || '';
    const usefulTitle = /^(?:ChatGPT(?: - Shared Content)?|이 채팅을 확인해 보세요|Check out this chat)$/i.test(pageTitle.trim()) ? '' : pageTitle;
    const missingTitle = !meta.title && !usefulTitle;
    const missingAuthor = !meta.author;
    meta.title = meta.title || usefulTitle || chapters[0].title || fallback;
    return { meta: meta, chapters: chapters, missingTitle: missingTitle, missingAuthor: missingAuthor };
  }
  root.ChatgptShareImport = { parse: parse, collect: collect, unflatten: unflatten, decodeMobile: decodeMobile, cleanAnswer: cleanAnswer };
})(window);
