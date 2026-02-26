

# Polish the Onboarding Experience

## File: `src/pages/Onboarding.tsx`

All changes are in this single file.

### 1. Stronger selected state for specialty buttons
- Add a checkmark icon (from lucide `Check`) inside selected buttons
- Use `font-medium` and `shadow-sm` on selected state for clearer distinction
- Add helper text "Select all that apply" below the "Specialties" label

### 2. Brand tone examples on hover/select
- Add an `example` field to each `BRAND_TONES` entry:
  - professional: *"We're pleased to present this exceptional property at 500 Las Olas Boulevard, offering refined coastal living."*
  - friendly: *"Exciting news! Just listed a beautiful home at 500 Las Olas — I'd love to show you around!"*
  - luxury: *"Discover refined coastal living at 500 Las Olas Boulevard, where sophistication meets the waterfront."*
  - casual: *"Hey! Just listed this amazing spot at 500 Las Olas. You've gotta see it — DM me!"*
- Show the example text below the button when that tone is selected, with a fade-in animation and italic styling

### 3. Step 5 summary
- Add a summary section listing what was configured: business profile, brand voice, vendors
- Show as a compact list with check icons before the "Start Working" button

### 4. Step transition animation
- Track `direction` state (forward/back) alongside `step`
- Wrap each step's content in a div with `animate-fade-in-up` (already in tailwind config)
- Use a `key={step}` on the wrapper to trigger re-mount animation on each step change

### Files modified: 1
- `src/pages/Onboarding.tsx`

