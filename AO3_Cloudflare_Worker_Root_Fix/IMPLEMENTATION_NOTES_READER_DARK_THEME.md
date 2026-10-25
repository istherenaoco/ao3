# Reader dark theme adjustment

- The reader's default state is deep navy dark (`dark`), while explicit saved reader-theme preferences remain respected.
- The reader dark canvas uses `#070d1a`, darker than the general app shell, with readable near-white body and chapter-title text.
- Chapter header/footer are explicitly transparent in dark-reader mode so the global app-header dark styling cannot create a mismatched black title strip.
- Chapter title wraps safely and uses a consistent line height; source/index metadata uses muted blue-gray for hierarchy.
- Applied the same HTML to `index.html`, `ao3.html`, `public/index.html`, and `public/ao3.html`.
- Static JavaScript syntax and ZIP integrity checks are required before delivery. A live browser visual test was not performed.
