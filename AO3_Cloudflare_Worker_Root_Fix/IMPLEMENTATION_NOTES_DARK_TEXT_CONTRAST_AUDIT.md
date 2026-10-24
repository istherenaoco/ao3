# Dark-mode text contrast audit v12

- Raised dark-theme foreground colors for amber/orange/success/info metadata and labels.
- Changed non-selected bookmark tag chips to a neutral dark surface with light warm text, avoiding dark amber text on dark amber backgrounds.
- Improved legibility for small count badges and category pills on rose/amber/blue/sky/orange/green tinted surfaces.
- Muted decorative rose text to neutral light gray; primary actions and genuine error/status styling remain differentiated.
- Increased legibility of disabled controls while preserving their disabled state.
- Applied the same CSS to `index.html`, `ao3.html`, `public/index.html`, and `public/ao3.html`.

## Checks

- Checked all four HTML copies for byte-for-byte identity.
- Checked inline JavaScript syntax.
- Checked CSS color contrast ratios for the new tag and category-chip palette (the primary light text on its surfaces exceeds WCAG AA contrast for normal-size text).
- ZIP integrity checked after packaging.
- Browser visual verification was not available in this run.
