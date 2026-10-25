# v73 — App-wide Green Theme

- Added persistent 🌿 Green mode beside Dark and Light in General Settings.
- Green palette references the reader's existing canvas green `#bcd6c1`, with forest text `#20382a` and coordinated light-green surfaces/borders.
- App theme selection now drives the reader canvas too: Light maps to the former paper palette, Green to the existing green palette, Dark to the former dark palette.
- Removed the reader-only background theme selector; typography and spacing controls remain.
- Preserved old saved theme values safely; app-wide theme is authoritative for reader background.
- Updated cache/build version to v73.0.
- Regression suite: `npm run check` passes.
