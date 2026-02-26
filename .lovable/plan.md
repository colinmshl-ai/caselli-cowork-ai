

# Rebrand to Match caselli.app + "Caselli Cowork"

## Brand Analysis

The parent site caselli.app uses:
- **Dark brown/maroon background** (~`#3A2030` range)
- **Serif logotype** for "Caselli" (elegant, editorial)
- **Accent colors**: pink `#E91E63`, gold `#FFC107`, deep orange `#FF5722`
- Light/muted text on dark backgrounds

Current Cowork app uses a light theme with Inter sans-serif and a warm tan primary (`#A1866F`). The rebrand will adopt the parent's dark palette and accent colors while keeping the app functional and readable.

## Changes

### 1. Color System (`src/index.css`)

Update CSS custom properties to reflect caselli.app's dark aesthetic:

**Light mode (now dark by default to match parent):**
- `--background`: deep brown-maroon (`#2D1B25` → ~`350 30% 14%`)
- `--foreground`: warm off-white (`#F5E6E0` → ~`15 40% 92%`)
- `--card` / `--popover`: slightly lighter dark (`#3A2530`)
- `--primary`: pink `#E91E63` → `340 82% 52%`
- `--primary-foreground`: white
- `--secondary`: muted dark brown panel
- `--muted-foreground`: warm gray
- `--border`: subtle warm dark border
- `--accent`: gold-tinted `#FFC107` for highlights
- `--destructive`: keep red

Remove the `.dark` block (app is now inherently dark-themed).

### 2. Typography (`src/index.css` + `tailwind.config.ts`)

- Import a serif font for the brand wordmark: `Playfair Display` (closest to caselli.app's serif logo)
- Add `font-serif: ['Playfair Display', 'Georgia', 'serif']` to tailwind config
- Keep `Inter` as `font-sans` for all body/UI text (no change there)

### 3. Text Updates — "Caselli" → "Caselli Cowork"

All branded text references updated:

| File | Current | New |
|------|---------|-----|
| `index.html` | `<title>Caselli Cowork</title>` | Keep (already correct) |
| `index.html` | og/meta descriptions | Already say "Caselli Cowork" — keep |
| `src/pages/Index.tsx` | Nav: "Caselli" | "Caselli Cowork" with serif font on "Caselli" |
| `src/pages/Index.tsx` | Hero text | Update copy |
| `src/pages/Login.tsx` | "Caselli" | "Caselli Cowork" |
| `src/pages/Signup.tsx` | "Caselli" | "Caselli Cowork" |
| `src/pages/Onboarding.tsx` | "Caselli" wordmark | "Caselli Cowork" |
| `src/components/AppLayout.tsx` | "C" in nav rail | Keep "C" (single letter is fine for icon) |
| `src/components/chat/ChatPanel.tsx` | "Caselli" in welcome + placeholder | "Caselli Cowork" |
| Email templates (6 files) | `<Text style={brand}>Caselli</Text>` | "Caselli Cowork" |
| `supabase/functions/chat/index.ts` | system prompt "You are Caselli" | "You are Caselli Cowork" |
| `supabase/functions/auth-email-hook/index.ts` | `SITE_NAME = "Caselli Cowork AI"` | "Caselli Cowork" |

### 4. Wordmark Styling

Wherever the brand name appears as a wordmark (nav, login, signup, onboarding):
- "Caselli" in `font-serif` (Playfair Display), "Cowork" in `font-sans` (Inter) at lighter weight
- This mirrors caselli.app's serif logo while distinguishing the sub-product

Example: `<span className="font-serif">Caselli</span> <span className="font-sans font-light">Cowork</span>`

### 5. Landing Page (`src/pages/Index.tsx`)

- Update nav brand to dual-font wordmark
- Update hero section colors (buttons use new pink primary)
- Footer links stay the same style, just recolored

### 6. Button Styling

- Primary buttons: pink `#E91E63` background with white text (matching parent's accent)
- Email template buttons: update `backgroundColor` from `#A1866F` to `#E91E63`

### 7. Files Modified (15 total)

**Frontend (8):**
- `src/index.css` — color system + serif font import
- `tailwind.config.ts` — add `font-serif`
- `src/pages/Index.tsx` — wordmark + colors
- `src/pages/Login.tsx` — wordmark
- `src/pages/Signup.tsx` — wordmark
- `src/pages/Onboarding.tsx` — wordmark
- `src/components/chat/ChatPanel.tsx` — text updates
- `src/components/AppLayout.tsx` — sidebar background

**Backend (7):**
- 6 email templates — brand text + button color
- `supabase/functions/chat/index.ts` — system prompt
- `supabase/functions/auth-email-hook/index.ts` — site name

