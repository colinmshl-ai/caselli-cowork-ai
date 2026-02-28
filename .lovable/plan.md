

## Improve Tool Progress Card Visibility and Tracking

### File 1: `src/components/chat/ToolProgressCard.tsx`

**Props change**: Add `stepInfo?: { current: number; total: number }` prop alongside `card`.

**Collapse delay**: Change 800ms → 3000ms (line 34).

**Collapsed badge improvements** (lines 42-48):
- Wrap in a group with hover state: `const [hovered, setHovered] = useState(false)`
- If `hovered`, render the full expanded card instead of the badge
- Badge: change `text-[10px]` → `text-xs`, add `cursor-pointer`
- Add left border color based on tool category:
  - Deal tools (`get_active_deals`, `get_deal_details`, `check_upcoming_deadlines`, `create_deal`, `update_deal`) → `border-l-2 border-l-emerald-500`
  - Content tools (`draft_social_post`, `draft_email`, `draft_listing_description`) → `border-l-2 border-l-violet-500`
  - Contact tools (`search_contacts`, `add_contact`, `update_contact`) → `border-l-2 border-l-blue-500`
  - Default → `border-l-2 border-l-gray-400`

**Step counter**: In the running state (lines 57-64), show `Step {current} of {total}` next to "Working..." when `stepInfo` is provided.

### File 2: `src/components/chat/ChatPanel.tsx`

**Track tool sequence count** (~line 372):
- Add `let toolStepCounter = 0;` alongside `toolCardMap`
- On each `tool_start` event (line 408), increment `toolStepCounter`
- Pass `stepInfo` when creating tool cards: `{ current: toolStepCounter, total: 3 }`

**Fix premature clearing** (line 593):
- Replace `setTimeout(() => setToolCards([]), 500)` with `setTimeout(() => setToolCards([]), 3500)` — waits for the 3000ms collapse delay + 500ms buffer so collapsed badges are visible

**Pass stepInfo in render** (line 858):
- Change `<ToolProgressCard key={card.id} card={card} />` to also pass `stepInfo` stored on each card

**Storage approach**: Add `stepCurrent` and `stepTotal` fields to the `ToolCard` interface so each card carries its own step info, avoiding prop threading issues. Update the interface, set values on `tool_start`, and after stream ends update all cards' `stepTotal` to the final `toolStepCounter` value.

### Updated ToolCard interface
```
export interface ToolCard {
  id: string;
  tool: string;
  inputSummary: string;
  status: "running" | "done";
  resultSummary?: string;
  success?: boolean;
  stepCurrent?: number;
  stepTotal?: number;
}
```

