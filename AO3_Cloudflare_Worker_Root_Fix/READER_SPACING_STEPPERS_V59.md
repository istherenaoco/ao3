# v59 — Reader spacing steppers

- Replaced slider and number inputs with plus/minus buttons.
- Values step by 1px and are clamped to the requested bounds:
  - Side margins: default 25px, 20–30px
  - Line spacing: default 20px, 15–25px
  - Paragraph spacing: default 5px, 2–10px
  - First-line indent: default 0px, 0–10px
- Saved legacy values are clamped into the new ranges on load.
- Reader preferences continue to auto-save and sync using the existing path.
