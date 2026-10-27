# v58 — Settings separation

- Split settings into two independent modals: general translation settings (app theme, translation prompt, additional prompt, post-translation text replacements) and API settings (engine/provider credentials, models, and quota dashboard).
- Added a separate home/header API settings button while retaining the gear button for general settings.
- Added independent save/close controls; general settings and API settings save their own fields without overwriting the other modal's unsaved fields.
- Renamed the former character/relationship/tone rules input to a general additional prompt while retaining the existing stored key for backward compatibility.
- Moved provider quota dashboard into API settings.
