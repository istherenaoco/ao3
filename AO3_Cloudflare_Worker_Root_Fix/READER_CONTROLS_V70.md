# v70 reader spacing control fix

- Reader spacing stepper buttons now use explicit light/dark app-theme colors, with separate hover and disabled states. This prevents the near-black buttons in light/green reader mode.
- Reader line-height minimum is now 10px, maximum remains 25px, step remains 1px.
- Loading/saving preference clamps and live controls use the same 10–25px bounds so previously stored values normalize consistently.
- Cache-busting and build marker advanced to v70.0.
- Validation: `npm run check` passed, including reader-spacing and existing regression tests.
