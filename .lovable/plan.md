

# Phase 1: Replace Dark Theme with Light Manus-Inspired Palette

The audit's #1 recommendation: swap the entire `:root` color block in `index.css` from the current dark/saturated theme to a minimal, near-monochrome light palette with warm tan (#A1866F) as the sole accent.

## Current State
- Dark background (HSL 350 30% 14%), pink primary (340 82% 52%), gold accent (45 100% 58%)
- Every page inherits these — one file change transforms the entire app

## Target Palette (from audit spec)

| Variable | Current | New |
|---|---|---|
| `--background` | 350 30% 14% (dark plum) | 40 20% 99% (off-white) |
| `--foreground` | 15 40% 92% (light) | 20 10% 15% (near-black) |
| `--card` | 345 25% 17% | 0 0% 100% (white) |
| `--card-foreground` | 15 40% 92% | 20 10% 15% |
| `--popover` | 345 25% 17% | 0 0% 100% |
| `--popover-foreground` | 15 40% 92% | 20 10% 15% |
| `--primary` | 340 82% 52% (pink) | 25 28% 54% (warm tan #A1866F) |
| `--primary-foreground` | 0 0% 100% | 0 0% 100% (white — stays) |
| `--secondary` | 345 20% 20% | 40 15% 96% (light warm gray) |
| `--secondary-foreground` | 15 40% 92% | 20 10% 15% |
| `--muted` | 345 20% 20% | 40 15% 96% |
| `--muted-foreground` | 15 15% 60% | 20 8% 55% (medium gray) |
| `--accent` | 45 100% 58% (gold) | 25 28% 54% (same as primary — remove gold) |
| `--accent-foreground` | 350 30% 14% | 0 0% 100% |
| `--destructive` | 0 84% 60% | 0 72% 51% (slightly muted red) |
| `--destructive-foreground` | 0 0% 100% | 0 0% 100% |
| `--border` | 345 15% 22% | 20 10% 90% (light gray) |
| `--input` | 345 15% 22% | 20 10% 90% |
| `--ring` | 340 82% 52% | 25 28% 54% |
| `--sidebar-background` | 350 30% 12% | 40 15% 97% |
| `--sidebar-foreground` | 15 40% 92% | 20 10% 15% |
| `--sidebar-primary` | 340 82% 52% | 25 28% 54% |
| `--sidebar-primary-foreground` | 0 0% 100% | 0 0% 100% |
| `--sidebar-accent` | 345 20% 18% | 40 15% 94% |
| `--sidebar-accent-foreground` | 15 40% 92% | 20 10% 15% |
| `--sidebar-border` | 345 15% 22% | 20 10% 90% |
| `--sidebar-ring` | 340 82% 52% | 25 28% 54% |

## File Modified: 1
- `src/index.css` — replace all `:root` CSS custom properties

## Remaining Phases (for future prompts)
- **Phase 2**: Chat input polish, message animations, slide-over transitions
- **Phase 3**: Heading sizes, page padding, skeleton loaders
- **Phase 4**: Mobile polish (tab animation, bottom nav, swipe)
- **Phase 5**: Empty states, billing integration, conversation management

