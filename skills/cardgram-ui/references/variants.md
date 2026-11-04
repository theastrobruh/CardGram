# Variants

Create alternatives by overriding tokens, not by scattering new values. Every variant below keeps CardGram's structure, radii, spacing and motion so it still feels like the same product family.

## 1. Sunset Glass

Warmer, softer, late-afternoon light. Use for lifestyle, music, fashion or creator profiles.

```css
[data-theme="sunset"] {
  --ink: #3d2433;
  --ink-soft: #67424f;
  --muted: #8c6a72;
  --muted-strong: #714e5b;
  --title: #3d2433;
  --label: #9d3f62;
  --aqua: #ff9a8b;
  --aqua-deep: #c85a7a;
  --sky: #b58be8;
  --sky-deep: #8b62c9;
  --mint: #ffe0c7;

  --accent: linear-gradient(135deg, #ffd3a5 0%, #ff9a8b 44%, #c86dd7 100%);
  --accent-hover: linear-gradient(135deg, #ffe0b8 0%, #ffab9d 44%, #d47de2 100%);

  --glass: rgba(255, 250, 248, .46);
  --glass-strong: rgba(255, 250, 248, .70);
  --glass-soft: rgba(255, 250, 248, .30);
  --stroke: rgba(255, 255, 255, .78);
  --stroke-soft: rgba(255, 255, 255, .52);

  --shadow-xl: 0 34px 80px rgba(92, 38, 67, .24);
  --shadow-lg: 0 22px 54px rgba(92, 38, 67, .16);
  --shadow-md: 0 10px 26px rgba(92, 38, 67, .11);
  --shadow-sm: 0 4px 12px rgba(92, 38, 67, .09);
  --inset-hi: inset 0 1px 0 rgba(255, 255, 255, .95);
  --inset-lo: inset 0 -1px 0 rgba(92, 38, 67, .06);
}

[data-theme="sunset"] body {
  background-color: #ffe0d0;
  background-image:
    radial-gradient(1100px 760px at 8% -6%, #fff6e8 0%, transparent 58%),
    radial-gradient(1000px 720px at 96% 4%, #ffd8e8 0%, transparent 55%),
    radial-gradient(900px 760px at 46% 112%, #e7d4ff 0%, transparent 62%),
    linear-gradient(152deg, #fff1d6 0%, #ffd7d0 46%, #e6c9f4 100%);
}
```

Orbs: peach → rose → lilac. Keep text dark plum, not gray.

## 2. Cyber Glass

Night-mode aqua with electric violet and hotter cyan. Use for gaming, AI tools and music tech.

```css
[data-theme="cyber"] {
  --ink: #e9fbff;
  --ink-soft: #b7d9e8;
  --muted: #7ea6bd;
  --muted-strong: #9fc4d6;
  --title: #f2fbff;
  --label: #7ff5ec;
  --aqua: #4fffe1;
  --aqua-deep: #28d7ff;
  --sky: #8a7dff;
  --sky-deep: #6a5cff;
  --mint: #b9fff4;

  --glass: rgba(10, 32, 54, .46);
  --glass-strong: rgba(12, 40, 66, .70);
  --glass-soft: rgba(10, 32, 54, .30);
  --glass-row: rgba(15, 44, 70, .44);
  --stroke: rgba(120, 240, 255, .28);
  --stroke-soft: rgba(120, 240, 255, .16);
  --stroke-ink: rgba(79, 255, 225, .24);

  --accent: linear-gradient(135deg, #4fffe1 0%, #28d7ff 46%, #8a7dff 100%);
  --accent-hover: linear-gradient(135deg, #7affea 0%, #56e4ff 46%, #a49aff 100%);

  --shadow-xl: 0 34px 80px rgba(0, 8, 24, .55);
  --shadow-lg: 0 22px 54px rgba(0, 8, 24, .40);
  --shadow-md: 0 10px 26px rgba(0, 8, 24, .30);
  --shadow-sm: 0 4px 12px rgba(0, 8, 24, .24);
  --inset-hi: inset 0 1px 0 rgba(180, 255, 255, .20);
  --inset-lo: inset 0 -1px 0 rgba(0, 0, 0, .24);
}

[data-theme="cyber"] body {
  background-color: #071426;
  background-image:
    radial-gradient(900px 700px at 10% -10%, rgba(40, 215, 255, .28), transparent 60%),
    radial-gradient(900px 700px at 96% 6%, rgba(138, 125, 255, .22), transparent 58%),
    radial-gradient(800px 700px at 50% 116%, rgba(79, 255, 225, .14), transparent 62%),
    linear-gradient(150deg, #06111f 0%, #0a1f35 52%, #101a3a 100%);
}
```

Cyber is the hardest variant for accessibility. Pure white text on saturated cyan fails; use white only on the dark gradient end or add a dark scrim. Test every state.

## 3. OLED Glass

Near-black glass with restrained aqua edge light. Use for pro tools, video and dark studios.

```css
[data-theme="oled"] {
  --ink: #f2fbff;
  --ink-soft: #b9cdd6;
  --muted: #7f98a4;
  --muted-strong: #a4bbc5;
  --title: #f2fbff;
  --label: #8fe9df;
  --aqua: #2ec4b6;
  --aqua-deep: #5ee6d8;
  --sky: #4aa8e0;
  --sky-deep: #78bff0;

  --glass: rgba(255, 255, 255, .06);
  --glass-strong: rgba(255, 255, 255, .10);
  --glass-soft: rgba(255, 255, 255, .04);
  --glass-row: rgba(255, 255, 255, .055);
  --stroke: rgba(255, 255, 255, .12);
  --stroke-soft: rgba(255, 255, 255, .08);
  --stroke-ink: rgba(46, 196, 182, .24);

  --shadow-xl: 0 34px 80px rgba(0, 0, 0, .60);
  --shadow-lg: 0 22px 54px rgba(0, 0, 0, .48);
  --shadow-md: 0 10px 26px rgba(0, 0, 0, .38);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, .30);
  --inset-hi: inset 0 1px 0 rgba(255, 255, 255, .10);
  --inset-lo: inset 0 -1px 0 rgba(0, 0, 0, .30);
}

[data-theme="oled"] body {
  background-color: #03070b;
  background-image:
    radial-gradient(900px 640px at 12% -8%, rgba(46, 196, 182, .16), transparent 60%),
    radial-gradient(800px 600px at 92% 4%, rgba(74, 168, 224, .12), transparent 58%),
    linear-gradient(160deg, #03070b 0%, #071018 55%, #000 100%);
}
```

Panels are **not** opaque black; they are 6–10% white glass so the light field still shows through. Borders become white at 12%, never aqua.

## 4. Structural variants

| Variant | Change | Keep |
|---|---|---|
| Editorial Glass | Serif display for the hero name, 8 px grid, more white space | Aqua field, glass panels, card 3D |
| Mono Studio | Remove the aqua gradient, use ink + one cyan accent; squarer 14 px radii | Layout, typography scale, shadows |
| Soft Play | 36 px radii, pastel orbs, 2 px borders, chunkier buttons | Dashboard anatomy, micro-labels |
| Data Dense | Shorter panels, 4-column stat grid, tabular numbers, 0.02em tracking | Glass hierarchy, hero card |

If you change radii **and** typography **and** color **and** motion, it is no longer a CardGram variant. Name it separately.

## 5. Variant QA

- Hero contrast: check title, subtitle and chips on the new field.
- Primary button contrast: white text needs a gradient dark enough at its lightest stop.
- Glass borders: on dark variants, white at 10–14% is enough; do not use the light-mode .72.
- Shadows: dark variants need black shadows, not cyan.
- Ambient orbs: reduce to 10–20% opacity; they should be a rumor, not a light show.
- Screenshot the same three widths as the base system and compare side by side.
