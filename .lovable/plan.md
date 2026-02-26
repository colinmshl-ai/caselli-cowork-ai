

# Improve Deals Page: Better Cards, Pipeline View, and Form Validation

## Changes

### 1. Richer deal cards (`src/pages/Deals.tsx`)
- Show list price (formatted as currency), deal type badge (Buyer/Seller), and client name on every card
- Already has colored dot for stage — keep it, but also add a light-colored background badge (e.g., `bg-blue-100 text-blue-700` for Lead)
- Format price with `Intl.NumberFormat`

### 2. Pipeline/Kanban view toggle (`src/pages/Deals.tsx`)
- Add a view toggle (List | Board) in the header next to "Add Deal"
- **List view**: current layout with richer cards
- **Board view**: horizontal scrolling columns, one per stage (excluding "all"). Each column header shows stage name, deal count, and total value
- Deals render as compact cards inside columns
- Add drag-and-drop using HTML5 native `draggable` + `onDragOver`/`onDrop` (no library needed for simple column moves). On drop, update the deal's stage via Supabase mutation

### 3. Deal detail slide-over enhancements (`src/components/deals/DealSlideOver.tsx`)
- When editing, show a "Deal Activity" section at the bottom that fetches from `task_history` where `metadata->deal_id` matches the deal id, displayed as a simple timeline
- Add 3 quick action buttons below the header when editing: "Draft email to client", "Create social post", "Update stage" — these navigate to chat with a pre-filled prompt (via URL param or callback)

### 4. Form validation (`src/components/deals/DealSlideOver.tsx`)
- Add `addressError` state, set on blur and on save attempt
- Show `<p className="text-xs text-destructive mt-1">Property address is required</p>` below the address input when empty
- Add `border-destructive` to the input when error is active
- Clear error on typing

### New file
- `src/components/deals/DealBoardView.tsx` — Kanban board component (extracted for clarity)

### Files modified: 3
- `src/pages/Deals.tsx` — richer cards, view toggle, board view integration
- `src/components/deals/DealSlideOver.tsx` — validation errors, activity timeline, quick actions
- `src/components/deals/DealBoardView.tsx` — new Kanban board component

