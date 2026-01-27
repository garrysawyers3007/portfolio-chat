# Design Token System

This document describes the comprehensive design token system implemented across the Portfolio Chat application.

## Overview

The design token system provides a single source of truth for all visual design decisions, enabling:
- **Consistent theming** across dark and light modes
- **Maintainable styles** with semantic naming
- **Accessible focus states** with keyboard navigation support
- **Reduced motion** support for users with vestibular disorders
- **Scalable spacing** based on a consistent scale

---

## Token Categories

### 🎨 Color Tokens

#### Background Layers
```css
--background     /* Base canvas (dark: #0B0F19, light: #F8FAFC) */
--surface        /* Cards, panels (dark: #0F172A, light: #FFFFFF) */
--surface-2      /* Elevated surfaces (dark: #1E293B, light: #F1F5F9) */
```

#### Borders
```css
--border         /* Subtle borders (dark: rgba(31,41,55,0.3), light: #E2E8F0) */
--border-strong  /* Emphasized borders (dark: rgba(31,41,55,0.5), light: #CBD5E1) */
```

#### Text
```css
--text           /* Primary text (dark: #E5E7EB, light: #0F172A) */
--text-muted     /* Secondary text (dark: rgba(156,163,175,0.85), light: rgba(71,85,105,0.85)) */
--text-subtle    /* De-emphasized text (dark: rgba(156,163,175,0.5), light: rgba(71,85,105,0.5)) */
```

#### Primary Colors
```css
--primary        /* Neon cyan accent (dark: #22D3EE, light: #0EA5E9) */
--primary-hover  /* Primary hover state (dark: #06B6D4, light: #0284C7) */
--primary-2      /* Violet secondary accent (#8B5CF6) */
--primary-2-hover /* Violet hover (#7C3AED) */
```

#### Status Colors
```css
--success        /* Green (#10B981 dark, #059669 light) */
--success-muted  /* Success background (rgba with 15% or 10% opacity) */
--warning        /* Amber (#F59E0B dark, #D97706 light) */
--warning-muted  /* Warning background */
--error          /* Red (#EF4444 dark, #DC2626 light) */
--error-muted    /* Error background */
```

#### Shadows
```css
--shadow-sm      /* Subtle shadow for cards */
--shadow-md      /* Medium elevation shadow */
--shadow-lg      /* High elevation shadow */
--shadow-focus   /* Cyan glow for focus states (0 0 0 3px rgba(cyan, 0.4)) */
```

---

### 📐 Geometry Tokens

#### Border Radius
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;  /* Perfect circles */
```

#### Spacing Scale (0.25rem = 4px base)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

**Usage Guidelines:**
- Component padding: `--space-4` to `--space-8`
- Section padding: `--space-8` to `--space-16`
- Gaps between elements: `--space-2` to `--space-6`
- Large vertical spacing: `--space-12` to `--space-24`

---

### ✍️ Typography Tokens

#### Font Families
```css
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Monaco', 'Courier New', monospace;
```

#### Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

### ⏱️ Motion Tokens

#### Transition Durations
```css
--transition-fast: 150ms;   /* Quick interactions (hover, button press) */
--transition-base: 200ms;   /* Standard transitions (most UI changes) */
--transition-slow: 300ms;   /* Slower animations (panel open/close) */
```

#### Transition Timing Functions
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);  /* Smooth start and end */
--ease-out: cubic-bezier(0, 0, 0.2, 1);       /* Smooth deceleration */
--ease-in: cubic-bezier(0.4, 0, 1, 1);        /* Smooth acceleration */
```

**Usage:**
```css
transition: color var(--transition-base) var(--ease-in-out),
            opacity var(--transition-base) var(--ease-in-out);
```

---

## Theme Switching

### Implementation

Themes are controlled via `data-theme` attribute on `<html>` or `<body>`:

```javascript
// Set dark theme
document.documentElement.setAttribute('data-theme', 'dark');

// Set light theme
document.documentElement.setAttribute('data-theme', 'light');
```

### System Preference Detection

The design system automatically respects system preferences:

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    /* Light theme tokens automatically applied */
  }
}
```

**Behavior:**
- If user manually sets theme → respect that choice
- If no manual theme set → follow system preference
- Persists across sessions (App.js handles localStorage)

---

## Accessibility Features

### Focus-Visible States

All interactive elements have enhanced focus rings for **keyboard navigation only** (not mouse clicks):

```css
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);  /* Cyan glow */
}
```

**Why focus-visible?**
- Mouse users: No visible focus ring (cleaner UX)
- Keyboard users: Clear focus indicators (better a11y)

### Reduced Motion Support

Respects user preference for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Applied to:**
- All animations (cursor blink, fade-ins, etc.)
- All transitions
- Smooth scrolling

---

## Usage Examples

### Component Styling

#### Before (hardcoded values):
```css
.card {
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(31, 41, 55, 0.25);
  border-radius: 4px;
  color: #E5E7EB;
  transition: border-color 0.2s ease;
}

.card:hover {
  border-color: rgba(31, 41, 55, 0.5);
}
```

#### After (design tokens):
```css
.card {
  padding: var(--space-4) var(--space-6);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  transition: border-color var(--transition-base) var(--ease-in-out),
              box-shadow var(--transition-base) var(--ease-in-out);
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}
```

### Interactive Elements

```css
.button {
  padding: var(--space-2) var(--space-4);
  background: var(--primary);
  color: var(--surface);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: background-color var(--transition-fast) var(--ease-in-out),
              transform var(--transition-fast) var(--ease-out);
}

.button:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}

.button:active {
  transform: translateY(0);
}
```

### Tech Badges (with hover effects)

```css
.tech-badge {
  padding: var(--space-1) var(--space-3);
  background: var(--surface-2);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-weight: var(--font-medium);
  font-size: 0.75rem;
  transition: background-color var(--transition-fast) var(--ease-in-out),
              color var(--transition-fast) var(--ease-in-out),
              border-color var(--transition-fast) var(--ease-in-out);
}

.tech-badge:hover {
  background: var(--primary-2);  /* Violet */
  color: var(--surface);
  border-color: var(--primary-2);
}
```

---

## Utility Classes

Commonly used utilities for quick styling:

### Spacing
```css
.mt-4 { margin-top: var(--space-4); }
.mb-6 { margin-bottom: var(--space-6); }
.p-4 { padding: var(--space-4); }
```

### Text
```css
.text-muted { color: var(--text-muted); }
.text-subtle { color: var(--text-subtle); }
.text-primary-color { color: var(--primary); }
```

### Surfaces
```css
.surface { background-color: var(--surface); }
.surface-2 { background-color: var(--surface-2); }
```

### Borders
```css
.border { border: 1px solid var(--border); }
.border-strong { border: 1px solid var(--border-strong); }
.border-radius { border-radius: var(--radius-md); }
```

---

## Migration Checklist

When migrating existing components to the design token system:

- [ ] Replace hardcoded colors with semantic tokens (`--text`, `--surface`, `--primary`)
- [ ] Replace px spacing with spacing scale (`var(--space-4)`)
- [ ] Replace hardcoded transitions with motion tokens (`var(--transition-base)`)
- [ ] Replace hardcoded border-radius with radius tokens (`var(--radius-md)`)
- [ ] Replace `:focus` with `:focus-visible` for keyboard-only focus rings
- [ ] Add `box-shadow: var(--shadow-focus)` to focus-visible states
- [ ] Test in both dark and light themes
- [ ] Verify reduced motion media query disables animations

---

## File Locations

### Token Definitions
- **Primary definition:** `src/index.css` (lines 1-200)
- **Dark theme:** `:root` selector (default)
- **Light theme:** `html[data-theme="light"]` and `@media (prefers-color-scheme: light)`

### Component Styles (Updated)
- `src/App.css` - Main app, nav, chat, input, suggestions
- `src/pages/Experience.css` - Work experience cards
- `src/pages/Projects.css` - Project grid cards
- `src/pages/Education.css` - Education timeline
- `src/pages/ContactMe.css` - Contact section, social links
- `src/pages/AboutMe.css` - Hero section, typing animation

---

## Best Practices

### ✅ Do
- Use semantic token names (`var(--text)`, not `var(--gray-200)`)
- Use spacing scale consistently (`var(--space-4)` not `16px`)
- Layer shadows for depth (`var(--shadow-sm)` → `var(--shadow-md)` on hover)
- Use `:focus-visible` for interactive elements
- Test both dark and light themes
- Use motion tokens for consistent timing

### ❌ Don't
- Hardcode colors (`#22D3EE` → use `var(--primary)`)
- Hardcode spacing (`padding: 16px` → use `var(--space-4)`)
- Use `:focus` instead of `:focus-visible` (creates mouse focus rings)
- Ignore reduced motion preferences
- Mix token scales (e.g., `calc(var(--space-3) * 2.5)` → use `var(--space-8)`)

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS variables (100% coverage in modern browsers)
- `:focus-visible` (100% coverage via polyfill if needed)
- `prefers-color-scheme` (95%+ coverage)
- `prefers-reduced-motion` (95%+ coverage)

---

## Future Enhancements

Potential additions to the token system:

1. **Breakpoint tokens** for responsive design
   ```css
   --breakpoint-sm: 640px;
   --breakpoint-md: 768px;
   --breakpoint-lg: 1024px;
   ```

2. **Z-index scale** for layering
   ```css
   --z-base: 1;
   --z-dropdown: 100;
   --z-modal: 1000;
   --z-toast: 2000;
   ```

3. **Animation presets** for common patterns
   ```css
   --animation-fade-in: fadeIn 200ms ease-out;
   --animation-slide-up: slideUp 300ms ease-out;
   ```

4. **Dark mode variant tokens** for specific overrides
   ```css
   --surface-hover-dark: rgba(31, 41, 55, 0.4);
   --surface-hover-light: rgba(241, 245, 249, 1);
   ```

---

## References

- **CSS Variables Spec:** https://www.w3.org/TR/css-variables/
- **Focus-visible Spec:** https://drafts.csswg.org/selectors-4/#the-focus-visible-pseudo
- **Prefers Reduced Motion:** https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion
- **WCAG Focus Guidelines:** https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html

---

**Last Updated:** January 2026  
**Status:** ✅ Production-ready
