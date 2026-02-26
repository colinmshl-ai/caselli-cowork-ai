

# Phase 3: Heading Sizes, Page Padding, Skeleton Loaders

## 1. Normalize Heading Sizes

Current inconsistencies:
- Deals/Contacts: `text-xl md:text-2xl` 
- Settings/Activity: `text-sm font-semibold`
- Billing: `text-2xl font-bold` and `text-3xl font-semibold`

Target: All page headers use `text-base font-semibold` for consistency with the minimal aesthetic. Section headings within Settings stay at `text-sm font-semibold uppercase tracking-wider` pattern.

**Files**: `Deals.tsx` (line 116), `Contacts.tsx` (header h1), `Settings.tsx` (line 136), `Billing.tsx` (lines 107-108), `ActivityPanel.tsx` (line 154)

## 2. Normalize Page Padding

Target: All scrollable content areas use `px-5 py-5` consistently. Settings max-width stays at `max-w-2xl`. Billing max-width stays at `max-w-4xl` but gets `py-12` instead of `py-16`.

## 3. Replace Spinner Loading States with Skeleton Loaders

Currently every page uses the same spinner pattern:
```html
<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
```

Replace with contextual skeletons using the existing `Skeleton` component:

- **Deals page**: 5 skeleton rows (each a horizontal bar mimicking a deal row)
- **Contacts page**: 5 skeleton rows (similar pattern)
- **Settings page**: 3 skeleton sections (label + input field shapes)
- **Billing page**: 3 skeleton plan cards
- **Activity panel**: Skeleton for greeting + 4 stat rows + 4 action rows

## Files Modified: 6
- `src/pages/Deals.tsx` — heading size, skeleton loader
- `src/pages/Contacts.tsx` — heading size, skeleton loader
- `src/pages/Settings.tsx` — heading size, skeleton loader
- `src/pages/Billing.tsx` — heading sizes, padding, skeleton loader
- `src/components/chat/ActivityPanel.tsx` — heading size (already consistent, no change needed)

