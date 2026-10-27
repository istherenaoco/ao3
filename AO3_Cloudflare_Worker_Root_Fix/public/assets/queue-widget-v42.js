
    (function () {
      function ensureAlwaysVisibleAo3Queue() {
        try {
          var box = document.getElementById('ao3LinkQueueBox');
          if (!box) {
            box = document.createElement('section');
            box.id = 'ao3LinkQueueBox';
            box.setAttribute('aria-live', 'polite');
            box.setAttribute('aria-label', 'AO3 링크 번역 대기열');
            box.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><strong id="ao3LinkQueueStatus">번역 대기열 · 0개 대기</strong><button id="clearAo3LinkQueueBtn" type="button" style="display:none;text-decoration:underline;border:0;background:transparent;cursor:pointer;">대기열 비우기</button></div><div id="ao3LinkQueueActive" style="display:none;margin-top:5px;overflow-wrap:anywhere;"></div><ol id="ao3LinkQueueList" style="margin:5px 0 0;padding-left:20px;overflow-wrap:anywhere;max-height:120px;overflow-y:auto;"></ol><p id="ao3LinkQueueEmpty" style="margin:5px 0 0;">대기 중인 링크가 없습니다. 번역 중 새 링크를 입력하면 이곳에 순서대로 쌓입니다.</p>';
          }

          // Keep the queue inside the chapter-add card, immediately below its heading.
          // Never append it to body or use fixed positioning: either behavior makes it
          // float over toast messages and hide the text behind it.
          var headings = document.querySelectorAll('#viewStudio h2');
          var targetHeading = null;
          for (var i = 0; i < headings.length; i++) {
            if ((headings[i].textContent || '').trim() === 'AO3 챕터 추가') {
              targetHeading = headings[i];
              break;
            }
          }
          if (targetHeading) {
            var headingRow = targetHeading.closest('.flex.items-center.gap-3');
            if (headingRow && headingRow.parentElement) {
              if (box.parentElement !== headingRow.parentElement || box.previousElementSibling !== headingRow) {
                headingRow.insertAdjacentElement('afterend', box);
              }
            }
          }

          var isLight = document.documentElement.getAttribute('data-app-theme') === 'light';
          var styles = {
            position: 'relative', right: 'auto', bottom: 'auto', top: 'auto', left: 'auto',
            zIndex: 'auto', display: 'block', visibility: 'visible', opacity: '1',
            width: '100%', maxWidth: '100%', maxHeight: '240px', overflowY: 'auto',
            overscrollBehavior: 'contain', marginTop: '12px', padding: '12px', boxSizing: 'border-box',
            border: '1px solid ' + (isLight ? '#bae6fd' : '#33445b'), borderRadius: '12px',
            background: isLight ? '#f0f7fc' : '#111d2d',
            color: isLight ? '#17324a' : '#e4edf8',
            boxShadow: 'none',
            font: '12px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
            pointerEvents: 'auto'
          };
          Object.keys(styles).forEach(function (key) {
            box.style.setProperty(key.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), styles[key], 'important');
          });
          box.classList.remove('hidden');
          box.hidden = false;
          box.removeAttribute('hidden');
          var status = document.getElementById('ao3LinkQueueStatus');
          if (status && !status.textContent.trim()) status.textContent = '번역 대기열 · 0개 대기';
        } catch (err) {
          // Queue visibility must never prevent the rest of the app from loading.
          console.error('[AO3 queue placement]', err);
        }
      }
      window.ensureAlwaysVisibleAo3Queue = ensureAlwaysVisibleAo3Queue;
      ensureAlwaysVisibleAo3Queue();
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAlwaysVisibleAo3Queue, { once: true });
      window.addEventListener('pageshow', ensureAlwaysVisibleAo3Queue);
      window.addEventListener('resize', ensureAlwaysVisibleAo3Queue);
    })();
  