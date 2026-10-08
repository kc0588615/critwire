# cc

Generated from the current project, including edits awaiting autosave. Return to the [theme index](../themes.md). Font names and weights are references only: license, download, and configure your own fonts.

## Foundations

```json
{
  "name": "cc",
  "primaryForeground": {
    "light": "neutral-2",
    "dark": "neutral-2"
  },
  "iconFamily": "Central",
  "animation": {
    "duration": 160,
    "easing": [
      0.16,
      1,
      0.3,
      1
    ],
    "large": {
      "type": "easing",
      "duration": 280,
      "easing": [
        0.16,
        1,
        0.3,
        1
      ],
      "visualDuration": 0.36,
      "bounce": 0.3
    },
    "popupScale": 0.96,
    "pressDistance": 1,
    "type": "easing",
    "visualDuration": 0.2,
    "bounce": 0.2
  },
  "spacing": {
    "zero": 0,
    "xxs": 4,
    "xs": 8,
    "s": 12,
    "m": 16,
    "l": 24,
    "xl": 32,
    "xxl": 48
  },
  "text": {
    "xxs": {
      "size": 10,
      "lineHeight": 14,
      "letterSpacing": -0.04
    },
    "xs": {
      "size": 12,
      "lineHeight": 16,
      "letterSpacing": -0.04
    },
    "s": {
      "size": 14,
      "lineHeight": 20,
      "letterSpacing": -0.04
    },
    "m": {
      "size": 16,
      "lineHeight": 24,
      "letterSpacing": -0.04
    },
    "l": {
      "size": 24,
      "lineHeight": 32,
      "letterSpacing": -0.04
    },
    "xl": {
      "size": 36,
      "lineHeight": 40,
      "letterSpacing": -0.04
    },
    "xxl": {
      "size": 48,
      "lineHeight": 52,
      "letterSpacing": -0.04
    }
  },
  "fonts": {
    "ui": {
      "family": "\"GT Maru\", sans-serif",
      "weights": {
        "regular": 400,
        "medium": 700,
        "heavy": 800
      }
    },
    "brand": {
      "family": "\"GT Maru\", sans-serif",
      "weights": {
        "regular": 400,
        "medium": 700,
        "heavy": 800
      }
    },
    "editorial": {
      "family": "\"GT Maru\", sans-serif",
      "weights": {
        "regular": 400,
        "medium": 700,
        "heavy": 800
      }
    },
    "data": {
      "family": "\"Open Runde\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "regular": 400,
        "medium": 700,
        "heavy": 800
      }
    }
  },
  "radius": {
    "zero": 0,
    "xs": 8,
    "s": 16,
    "m": 22,
    "l": 28,
    "xl": 40,
    "full": 9999
  },
  "border": {
    "none": 0,
    "s": 0,
    "m": 0,
    "l": 0
  },
  "shadows": {
    "s": {
      "x": 0,
      "y": 2,
      "blur": 4,
      "spread": 0,
      "opacity": 0,
      "color": {
        "light": "neutral-10",
        "dark": "neutral-1"
      }
    },
    "m": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "spread": 0,
      "opacity": 12,
      "color": {
        "light": "neutral-10",
        "dark": "neutral-1"
      }
    },
    "l": {
      "x": 0,
      "y": 16,
      "blur": 48,
      "spread": 0,
      "opacity": 0,
      "color": {
        "light": "neutral-10",
        "dark": "neutral-1"
      }
    }
  },
  "iconStyle": "filled",
  "buttonRadius": "full",
  "neutralTone": "warm",
  "colorEmphasis": 75,
  "primaryActionColor": "color-1"
}
```

## light CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | cc |
| `--theme-icon-family` | Central |
| `--theme-icon-style` | filled |
| `--toolbar-divider-bleed` | 0 |
| `--focus-ring-outline` | initial |
| `--icon-stroke-width` | 2 |
| `--icon-light-display` | none |
| `--icon-regular-display` | inline |
| `--icon-bold-display` | none |
| `--motion-duration` | 160ms |
| `--motion-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.16 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 280ms |
| `--motion-large-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.28 |
| `--motion-large-bounce` | 0.3 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #00906c |
| `--option-badge-foreground` | #fcfbfa |
| `--navigation-active-foreground` | #fcfbfa |
| `--emphasis-chart-fill` | #00906c33 |
| `--emphasis-balance-background` | #123d5c |
| `--emphasis-rewards-background` | #abff5a |
| `--emphasis-icon-background` | #ffd56a |
| `--emphasis-icon-foreground` | #000000 |
| `--emphasis-type-background` | #00906c |
| `--emphasis-type-foreground` | #fcfbfa |
| `--navigation-active-background` | #00906c |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 8px |
| `--space-s` | 12px |
| `--space-m` | 16px |
| `--space-l` | 24px |
| `--space-xl` | 32px |
| `--space-xxl` | 48px |
| `--size-xxs` | 10px |
| `--line-xxs` | 14px |
| `--letter-spacing-xxs` | -0.04em |
| `--size-xs` | 12px |
| `--line-xs` | 16px |
| `--letter-spacing-xs` | -0.04em |
| `--size-s` | 14px |
| `--line-s` | 20px |
| `--letter-spacing-s` | -0.04em |
| `--size-m` | 16px |
| `--line-m` | 24px |
| `--letter-spacing-m` | -0.04em |
| `--size-l` | 24px |
| `--line-l` | 32px |
| `--letter-spacing-l` | -0.04em |
| `--size-xl` | 36px |
| `--line-xl` | 40px |
| `--letter-spacing-xl` | -0.04em |
| `--size-xxl` | 48px |
| `--line-xxl` | 52px |
| `--letter-spacing-xxl` | -0.04em |
| `--radius-zero` | 0px |
| `--radius-xs` | 8px |
| `--radius-s` | 16px |
| `--radius-m` | 22px |
| `--radius-l` | 28px |
| `--radius-xl` | 40px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 0px |
| `--border-m` | 0px |
| `--border-l` | 0px |
| `--border-default-color` | #e9e5df33 |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 0 transparent |
| `--border-shadow-m` | 0 0 0 0 transparent |
| `--border-shadow-l` | 0 0 0 0 transparent |
| `--font-ui` | "GT Maru", sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 700 |
| `--weight-ui-heavy` | 800 |
| `--font-brand` | "GT Maru", sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 700 |
| `--weight-brand-heavy` | 800 |
| `--font-editorial` | "GT Maru", sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 700 |
| `--weight-editorial-heavy` | 800 |
| `--font-data` | "Open Runde", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 700 |
| `--weight-data-heavy` | 800 |
| `--color-none` | transparent |
| `--color-1` | #00906c |
| `--color-1-transparent` | #00906c33 |
| `--color-2` | #abff5a |
| `--color-2-transparent` | #abff5a33 |
| `--color-3` | #ffd56a |
| `--color-3-transparent` | #ffd56a33 |
| `--color-4` | #123d5c |
| `--color-4-transparent` | #123d5c33 |
| `--neutral-1` | #ffffff |
| `--neutral-1-transparent` | #ffffff33 |
| `--neutral-2` | #fcfbfa |
| `--neutral-2-transparent` | #fcfbfa33 |
| `--neutral-3` | #f5f4f1 |
| `--neutral-3-transparent` | #f5f4f133 |
| `--neutral-4` | #e9e5df |
| `--neutral-4-transparent` | #e9e5df33 |
| `--neutral-5` | #d2ccbf |
| `--neutral-5-transparent` | #d2ccbf33 |
| `--neutral-6` | #a5a094 |
| `--neutral-6-transparent` | #a5a09433 |
| `--neutral-7` | #837e72 |
| `--neutral-7-transparent` | #837e7233 |
| `--neutral-8` | #595449 |
| `--neutral-8-transparent` | #59544933 |
| `--neutral-9` | #383329 |
| `--neutral-9-transparent` | #38332933 |
| `--neutral-10` | #000000 |
| `--neutral-10-transparent` | #00000033 |
| `--success` | #00c853 |
| `--success-transparent` | #00c85333 |
| `--warning` | #ffea00 |
| `--warning-transparent` | #ffea0033 |
| `--error` | #fc032d |
| `--error-transparent` | #fc032d33 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 2px 4px 0px #00000000 |
| `--shadow-m` | 0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013 |
| `--shadow-l` | 0px 16px 48px 0px #00000000 |
| `--cte-canvas` | #ffffff |
| `--cte-surface` | #fcfbfa |
| `--cte-surface-muted` | #f5f4f1 |
| `--cte-text` | #000000 |
| `--cte-text-muted` | #837e72 |
| `--cte-border` | #e9e5df33 |
| `--cte-accent` | #00906c |
| `--cte-accent-text` | #fcfbfa |
| `--cte-danger` | #fc032d |
| `--cte-focus` | #00906c |
| `--cte-font` | "GT Maru", sans-serif |
| `--cte-font-size` | 14px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 20px |
| `--cte-letter-spacing` | -0.04em |
| `--cte-detail-font-size` | 12px |
| `--cte-detail-line-height` | 16px |
| `--cte-detail-letter-spacing` | -0.04em |

## dark CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | cc |
| `--theme-icon-family` | Central |
| `--theme-icon-style` | filled |
| `--toolbar-divider-bleed` | 0 |
| `--focus-ring-outline` | initial |
| `--icon-stroke-width` | 2 |
| `--icon-light-display` | none |
| `--icon-regular-display` | inline |
| `--icon-bold-display` | none |
| `--motion-duration` | 160ms |
| `--motion-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.16 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 280ms |
| `--motion-large-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.28 |
| `--motion-large-bounce` | 0.3 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #00906c |
| `--option-badge-foreground` | #241f16 |
| `--navigation-active-foreground` | #241f16 |
| `--emphasis-chart-fill` | #00906c33 |
| `--emphasis-balance-background` | #123d5c |
| `--emphasis-rewards-background` | #abff5a |
| `--emphasis-icon-background` | #ffd56a |
| `--emphasis-icon-foreground` | #000000 |
| `--emphasis-type-background` | #00906c |
| `--emphasis-type-foreground` | #241f16 |
| `--navigation-active-background` | #00906c |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 8px |
| `--space-s` | 12px |
| `--space-m` | 16px |
| `--space-l` | 24px |
| `--space-xl` | 32px |
| `--space-xxl` | 48px |
| `--size-xxs` | 10px |
| `--line-xxs` | 14px |
| `--letter-spacing-xxs` | -0.04em |
| `--size-xs` | 12px |
| `--line-xs` | 16px |
| `--letter-spacing-xs` | -0.04em |
| `--size-s` | 14px |
| `--line-s` | 20px |
| `--letter-spacing-s` | -0.04em |
| `--size-m` | 16px |
| `--line-m` | 24px |
| `--letter-spacing-m` | -0.04em |
| `--size-l` | 24px |
| `--line-l` | 32px |
| `--letter-spacing-l` | -0.04em |
| `--size-xl` | 36px |
| `--line-xl` | 40px |
| `--letter-spacing-xl` | -0.04em |
| `--size-xxl` | 48px |
| `--line-xxl` | 52px |
| `--letter-spacing-xxl` | -0.04em |
| `--radius-zero` | 0px |
| `--radius-xs` | 8px |
| `--radius-s` | 16px |
| `--radius-m` | 22px |
| `--radius-l` | 28px |
| `--radius-xl` | 40px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 0px |
| `--border-m` | 0px |
| `--border-l` | 0px |
| `--border-default-color` | #413c3233 |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 0 transparent |
| `--border-shadow-m` | 0 0 0 0 transparent |
| `--border-shadow-l` | 0 0 0 0 transparent |
| `--font-ui` | "GT Maru", sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 700 |
| `--weight-ui-heavy` | 800 |
| `--font-brand` | "GT Maru", sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 700 |
| `--weight-brand-heavy` | 800 |
| `--font-editorial` | "GT Maru", sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 700 |
| `--weight-editorial-heavy` | 800 |
| `--font-data` | "Open Runde", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 700 |
| `--weight-data-heavy` | 800 |
| `--color-none` | transparent |
| `--color-1` | #00906c |
| `--color-1-transparent` | #00906c33 |
| `--color-2` | #abff5a |
| `--color-2-transparent` | #abff5a33 |
| `--color-3` | #ffd56a |
| `--color-3-transparent` | #ffd56a33 |
| `--color-4` | #123d5c |
| `--color-4-transparent` | #123d5c33 |
| `--neutral-1` | #000000 |
| `--neutral-1-transparent` | #00000033 |
| `--neutral-2` | #241f16 |
| `--neutral-2-transparent` | #241f1633 |
| `--neutral-3` | #2f2a21 |
| `--neutral-3-transparent` | #2f2a2133 |
| `--neutral-4` | #413c32 |
| `--neutral-4-transparent` | #413c3233 |
| `--neutral-5` | #5b564b |
| `--neutral-5-transparent` | #5b564b33 |
| `--neutral-6` | #888377 |
| `--neutral-6-transparent` | #88837733 |
| `--neutral-7` | #b0aa9e |
| `--neutral-7-transparent` | #b0aa9e33 |
| `--neutral-8` | #d4cec2 |
| `--neutral-8-transparent` | #d4cec233 |
| `--neutral-9` | #f5f4f1 |
| `--neutral-9-transparent` | #f5f4f133 |
| `--neutral-10` | #ffffff |
| `--neutral-10-transparent` | #ffffff33 |
| `--success` | #00c853 |
| `--success-transparent` | #00c85333 |
| `--warning` | #ffea00 |
| `--warning-transparent` | #ffea0033 |
| `--error` | #fc032d |
| `--error-transparent` | #fc032d33 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 2px 4px 0px #00000000 |
| `--shadow-m` | 0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013 |
| `--shadow-l` | 0px 16px 48px 0px #00000000 |
| `--cte-canvas` | #000000 |
| `--cte-surface` | #241f16 |
| `--cte-surface-muted` | #2f2a21 |
| `--cte-text` | #ffffff |
| `--cte-text-muted` | #b0aa9e |
| `--cte-border` | #413c3233 |
| `--cte-accent` | #00906c |
| `--cte-accent-text` | #241f16 |
| `--cte-danger` | #fc032d |
| `--cte-focus` | #00906c |
| `--cte-font` | "GT Maru", sans-serif |
| `--cte-font-size` | 14px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 20px |
| `--cte-letter-spacing` | -0.04em |
| `--cte-detail-font-size` | 12px |
| `--cte-detail-line-height` | 16px |
| `--cte-detail-letter-spacing` | -0.04em |

## Authored component assignments

These are project edits. The [component reference](cc-components.md) includes the effective assignments with defaults and shared parts resolved.

```json
{
  "componentTokens": {
    "button:primary:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:secondary:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:outline:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:ghost:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "button:danger:rest": {
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "l"
    },
    "input:default:rest": {
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "m"
    },
    "select:default:rest": {
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "m"
    },
    "combobox:default:rest": {
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s",
      "paddingX": "m"
    },
    "autocomplete:default:part:popover:rest": {
      "radius": "s"
    },
    "autocomplete:default:part:input:rest": {
      "paddingTop": "s",
      "paddingRight": "s",
      "paddingBottom": "s",
      "paddingLeft": "s",
      "paddingX": "s"
    },
    "autocomplete:default:part:option:selected": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "autocomplete:default:part:option:rest": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "checkbox:default:part:control:rest": {
      "controlSize": "l"
    },
    "combobox:default:part:option:selected": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "combobox:default:part:option:rest": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "menu:default:part:option:selected": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "menu:default:part:option:rest": {
      "paddingTop": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs",
      "paddingLeft": "xs",
      "paddingX": "xs"
    },
    "otp-field:default:part:input:rest": {
      "paddingTop": "xs",
      "paddingRight": "s",
      "paddingBottom": "xs",
      "paddingLeft": "s",
      "paddingX": "s"
    },
    "slider:default:part:track:rest": {
      "controlSize": "xl"
    },
    "slider:default:part:thumb:rest": {
      "controlSize": "l"
    },
    "switch:default:part:control:rest": {
      "controlSize": "xl"
    }
  },
  "componentVariants": {}
}
```
