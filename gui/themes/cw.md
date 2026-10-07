# cw

Generated from the current project, including edits awaiting autosave. Return to the [theme index](../themes.md). Font names and weights are references only: license, download, and configure your own fonts.

## Foundations

```json
{
  "name": "cw",
  "text": {
    "l": {
      "size": 22,
      "lineHeight": 29,
      "letterSpacing": 0
    },
    "m": {
      "size": 15,
      "lineHeight": 22,
      "letterSpacing": 0
    },
    "s": {
      "size": 13,
      "lineHeight": 18,
      "letterSpacing": 0
    },
    "xl": {
      "size": 33,
      "lineHeight": 36,
      "letterSpacing": 0
    },
    "xs": {
      "size": 11,
      "lineHeight": 15,
      "letterSpacing": 0
    },
    "xxl": {
      "size": 44,
      "lineHeight": 47,
      "letterSpacing": 0
    },
    "xxs": {
      "size": 9,
      "lineHeight": 13,
      "letterSpacing": 0
    }
  },
  "fonts": {
    "ui": {
      "family": "\"GT Standard M\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 700,
        "medium": 500,
        "regular": 400
      }
    },
    "data": {
      "family": "\"Sidebar Geist Mono\", monospace",
      "weights": {
        "heavy": 700,
        "medium": 500,
        "regular": 400
      }
    },
    "brand": {
      "family": "\"GT Standard M\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 700,
        "medium": 500,
        "regular": 400
      }
    },
    "editorial": {
      "family": "\"GT Standard M\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 700,
        "medium": 500,
        "regular": 400
      }
    }
  },
  "border": {
    "l": 2,
    "m": 1,
    "s": 1,
    "none": 0
  },
  "radius": {
    "l": 14,
    "m": 7,
    "s": 5,
    "xl": 22,
    "xs": 2,
    "full": 9999,
    "zero": 0
  },
  "shadows": {
    "l": {
      "x": 0,
      "y": 12,
      "blur": 30,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    },
    "m": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    },
    "s": {
      "x": 0,
      "y": 1,
      "blur": 2,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    }
  },
  "spacing": {
    "l": 19,
    "m": 12,
    "s": 9,
    "xl": 25,
    "xs": 6,
    "xxl": 37,
    "xxs": 3,
    "zero": 0
  },
  "animation": {
    "large": {
      "easing": [
        0.16,
        1,
        0.3,
        1
      ],
      "duration": 300
    },
    "easing": [
      0.2,
      0.8,
      0.2,
      1
    ],
    "duration": 150,
    "popupScale": 0.96,
    "pressDistance": 1
  },
  "iconStyle": "outlined",
  "iconFamily": "Central",
  "neutralTone": "cool",
  "colorEmphasis": 65,
  "primaryForeground": {},
  "primaryActionColor": "color-1"
}
```

## light CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | cw |
| `--theme-icon-family` | Central |
| `--theme-icon-style` | outlined |
| `--toolbar-divider-bleed` | 1 |
| `--focus-ring-outline` | 2px solid color-mix(in srgb, #000000 50%, transparent) |
| `--icon-stroke-width` | 2 |
| `--icon-light-display` | none |
| `--icon-regular-display` | inline |
| `--icon-bold-display` | none |
| `--motion-duration` | 150ms |
| `--motion-easing` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.15 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 300ms |
| `--motion-large-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.3 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | color-mix(in srgb, var(--color-1) 10%, transparent) |
| `--option-badge-foreground` | #31c3e8 |
| `--navigation-active-foreground` | #000000 |
| `--emphasis-chart-fill` | #31c3e833 |
| `--emphasis-balance-background` | #eef0f3 |
| `--emphasis-rewards-background` | #eef0f3 |
| `--emphasis-icon-background` | #eef0f3 |
| `--emphasis-icon-foreground` | #000000 |
| `--emphasis-type-background` | #eef0f3 |
| `--emphasis-type-foreground` | #000000 |
| `--navigation-active-background` | #31c3e833 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 3px |
| `--space-xs` | 6px |
| `--space-s` | 9px |
| `--space-m` | 12px |
| `--space-l` | 19px |
| `--space-xl` | 25px |
| `--space-xxl` | 37px |
| `--size-xxs` | 9px |
| `--line-xxs` | 13px |
| `--letter-spacing-xxs` | 0em |
| `--size-xs` | 11px |
| `--line-xs` | 15px |
| `--letter-spacing-xs` | 0em |
| `--size-s` | 13px |
| `--line-s` | 18px |
| `--letter-spacing-s` | 0em |
| `--size-m` | 15px |
| `--line-m` | 22px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 22px |
| `--line-l` | 29px |
| `--letter-spacing-l` | 0em |
| `--size-xl` | 33px |
| `--line-xl` | 36px |
| `--letter-spacing-xl` | 0em |
| `--size-xxl` | 44px |
| `--line-xxl` | 47px |
| `--letter-spacing-xxl` | 0em |
| `--radius-zero` | 0px |
| `--radius-xs` | 2px |
| `--radius-s` | 5px |
| `--radius-m` | 7px |
| `--radius-l` | 14px |
| `--radius-xl` | 22px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 1px |
| `--border-m` | 1px |
| `--border-l` | 2px |
| `--border-default-color` | rgb(0 0 0 / 0.1) |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-m` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-l` | 0 0 0 2px rgb(0 0 0 / 0.1) |
| `--font-ui` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 500 |
| `--weight-ui-heavy` | 700 |
| `--font-brand` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 500 |
| `--weight-brand-heavy` | 700 |
| `--font-editorial` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 500 |
| `--weight-editorial-heavy` | 700 |
| `--font-data` | "Sidebar Geist Mono", monospace |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 500 |
| `--weight-data-heavy` | 700 |
| `--color-none` | transparent |
| `--color-1` | #31c3e8 |
| `--color-1-transparent` | #31c3e833 |
| `--color-2` | #76ef6b |
| `--color-2-transparent` | #76ef6b33 |
| `--color-3` | #009ff0 |
| `--color-3-transparent` | #009ff033 |
| `--color-4` | #e864ff |
| `--color-4-transparent` | #e864ff33 |
| `--neutral-1` | #ffffff |
| `--neutral-1-transparent` | #ffffff33 |
| `--neutral-2` | #f9fafb |
| `--neutral-2-transparent` | #f9fafb33 |
| `--neutral-3` | #eef0f3 |
| `--neutral-3-transparent` | #eef0f333 |
| `--neutral-4` | #dadee3 |
| `--neutral-4-transparent` | #dadee333 |
| `--neutral-5` | #c0c6cd |
| `--neutral-5-transparent` | #c0c6cd33 |
| `--neutral-6` | #91979e |
| `--neutral-6-transparent` | #91979e33 |
| `--neutral-7` | #686d73 |
| `--neutral-7-transparent` | #686d7333 |
| `--neutral-8` | #41464c |
| `--neutral-8-transparent` | #41464c33 |
| `--neutral-9` | #21252b |
| `--neutral-9-transparent` | #21252b33 |
| `--neutral-10` | #000000 |
| `--neutral-10-transparent` | #00000033 |
| `--success` | #76ef6b |
| `--success-transparent` | #76ef6b33 |
| `--warning` | #ffa344 |
| `--warning-transparent` | #ffa34433 |
| `--error` | #ff5263 |
| `--error-transparent` | #ff526333 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 1px 2px 0px #00000000 |
| `--shadow-m` | 0px 8px 24px 0px #00000000 |
| `--shadow-l` | 0px 12px 30px 0px #00000000 |
| `--cte-canvas` | #ffffff |
| `--cte-surface` | #f9fafb |
| `--cte-surface-muted` | #eef0f3 |
| `--cte-text` | #000000 |
| `--cte-text-muted` | #686d73 |
| `--cte-border` | rgb(0 0 0 / 0.1) |
| `--cte-accent` | #31c3e8 |
| `--cte-accent-text` | #000000 |
| `--cte-danger` | #ff5263 |
| `--cte-focus` | #31c3e8 |
| `--cte-font` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--cte-font-size` | 15px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 22px |
| `--cte-letter-spacing` | 0em |
| `--cte-detail-font-size` | 15px |
| `--cte-detail-line-height` | 22px |
| `--cte-detail-letter-spacing` | 0em |

## dark CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | cw |
| `--theme-icon-family` | Central |
| `--theme-icon-style` | outlined |
| `--toolbar-divider-bleed` | 1 |
| `--focus-ring-outline` | 2px solid color-mix(in srgb, #ffffff 50%, transparent) |
| `--icon-stroke-width` | 2 |
| `--icon-light-display` | none |
| `--icon-regular-display` | inline |
| `--icon-bold-display` | none |
| `--motion-duration` | 150ms |
| `--motion-easing` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.15 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 300ms |
| `--motion-large-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.3 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | color-mix(in srgb, var(--color-1) 10%, transparent) |
| `--option-badge-foreground` | #31c3e8 |
| `--navigation-active-foreground` | #ffffff |
| `--emphasis-chart-fill` | #31c3e833 |
| `--emphasis-balance-background` | #2a2b2d |
| `--emphasis-rewards-background` | #2a2b2d |
| `--emphasis-icon-background` | #2a2b2d |
| `--emphasis-icon-foreground` | #ffffff |
| `--emphasis-type-background` | #2a2b2d |
| `--emphasis-type-foreground` | #ffffff |
| `--navigation-active-background` | #31c3e833 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 3px |
| `--space-xs` | 6px |
| `--space-s` | 9px |
| `--space-m` | 12px |
| `--space-l` | 19px |
| `--space-xl` | 25px |
| `--space-xxl` | 37px |
| `--size-xxs` | 9px |
| `--line-xxs` | 13px |
| `--letter-spacing-xxs` | 0em |
| `--size-xs` | 11px |
| `--line-xs` | 15px |
| `--letter-spacing-xs` | 0em |
| `--size-s` | 13px |
| `--line-s` | 18px |
| `--letter-spacing-s` | 0em |
| `--size-m` | 15px |
| `--line-m` | 22px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 22px |
| `--line-l` | 29px |
| `--letter-spacing-l` | 0em |
| `--size-xl` | 33px |
| `--line-xl` | 36px |
| `--letter-spacing-xl` | 0em |
| `--size-xxl` | 44px |
| `--line-xxl` | 47px |
| `--letter-spacing-xxl` | 0em |
| `--radius-zero` | 0px |
| `--radius-xs` | 2px |
| `--radius-s` | 5px |
| `--radius-m` | 7px |
| `--radius-l` | 14px |
| `--radius-xl` | 22px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 1px |
| `--border-m` | 1px |
| `--border-l` | 2px |
| `--border-default-color` | rgb(0 0 0 / 0.1) |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-m` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-l` | 0 0 0 2px rgb(0 0 0 / 0.1) |
| `--font-ui` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 500 |
| `--weight-ui-heavy` | 700 |
| `--font-brand` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 500 |
| `--weight-brand-heavy` | 700 |
| `--font-editorial` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 500 |
| `--weight-editorial-heavy` | 700 |
| `--font-data` | "Sidebar Geist Mono", monospace |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 500 |
| `--weight-data-heavy` | 700 |
| `--color-none` | transparent |
| `--color-1` | #31c3e8 |
| `--color-1-transparent` | #31c3e833 |
| `--color-2` | #76ef6b |
| `--color-2-transparent` | #76ef6b33 |
| `--color-3` | #009ff0 |
| `--color-3-transparent` | #009ff033 |
| `--color-4` | #e864ff |
| `--color-4-transparent` | #e864ff33 |
| `--neutral-1` | #000000 |
| `--neutral-1-transparent` | #00000033 |
| `--neutral-2` | #1f2022 |
| `--neutral-2-transparent` | #1f202233 |
| `--neutral-3` | #2a2b2d |
| `--neutral-3-transparent` | #2a2b2d33 |
| `--neutral-4` | #37383a |
| `--neutral-4-transparent` | #37383a33 |
| `--neutral-5` | #4f5052 |
| `--neutral-5-transparent` | #4f505233 |
| `--neutral-6` | #767779 |
| `--neutral-6-transparent` | #76777933 |
| `--neutral-7` | #a1a3a6 |
| `--neutral-7-transparent` | #a1a3a633 |
| `--neutral-8` | #c4c6c9 |
| `--neutral-8-transparent` | #c4c6c933 |
| `--neutral-9` | #e4e5e6 |
| `--neutral-9-transparent` | #e4e5e633 |
| `--neutral-10` | #ffffff |
| `--neutral-10-transparent` | #ffffff33 |
| `--success` | #76ef6b |
| `--success-transparent` | #76ef6b33 |
| `--warning` | #ffa344 |
| `--warning-transparent` | #ffa34433 |
| `--error` | #ff5263 |
| `--error-transparent` | #ff526333 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 1px 2px 0px #00000000 |
| `--shadow-m` | 0px 8px 24px 0px #00000000 |
| `--shadow-l` | 0px 12px 30px 0px #00000000 |
| `--cte-canvas` | #000000 |
| `--cte-surface` | #1f2022 |
| `--cte-surface-muted` | #2a2b2d |
| `--cte-text` | #ffffff |
| `--cte-text-muted` | #a1a3a6 |
| `--cte-border` | rgb(0 0 0 / 0.1) |
| `--cte-accent` | #31c3e8 |
| `--cte-accent-text` | #000000 |
| `--cte-danger` | #ff5263 |
| `--cte-focus` | #31c3e8 |
| `--cte-font` | "GT Standard M", -apple-system, BlinkMacSystemFont, sans-serif |
| `--cte-font-size` | 15px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 22px |
| `--cte-letter-spacing` | 0em |
| `--cte-detail-font-size` | 15px |
| `--cte-detail-line-height` | 22px |
| `--cte-detail-letter-spacing` | 0em |

## Authored component assignments

These are project edits. The [component reference](cw-components.md) includes the effective assignments with defaults and shared parts resolved.

```json
{
  "componentTokens": {
    "switch:default:part:row:rest": {
      "gap": "s"
    },
    "switch:default:part:label:rest": {
      "textSize": "m"
    },
    "checkbox:default:part:label:rest": {
      "textSize": "m"
    },
    "switch:default:part:control:rest": {
      "controlSize": "xl"
    }
  },
  "componentVariants": {}
}
```
