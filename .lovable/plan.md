

## Layout Redesign: Full-Width Chat with Floating Activity Cards

### Problem
The chat panel is constrained to 58% width with the activity panel taking 42% as a fixed sidebar. This makes the chat feel cramped and left-aligned.

### Approach
- Make the chat panel full-width and centered (max-width ~720px, centered like ChatGPT/Claude)
- Convert the activity panel into floating overlay cards positioned in the top-right corner
- Activity cards show stats, briefing, and quick actions as dismissible/collapsible floating elements
- On mobile, activity becomes a slide-up sheet accessible via a button

### Files to modify

**`src/pages/Chat.tsx`**
- Remove the 58/42 split layout
- Make chat panel `flex-1` full width
- Remove the activity panel as a sidebar column
- Add a floating activity overlay container (absolute/fixed positioned top-right)
- Add a toggle button (Activity icon) in the chat header area to show/hide the floating cards

**`src/components/chat/ActivityPanel.tsx`**
- Refactor from a full sidebar into a floating card layout
- Wrap each section (stats grid, briefing, quick actions, recent activity) in individual rounded cards with shadows
- Add a close/minimize button
- Use `max-w-[320px]` width, `max-h-[70vh]` with scroll
- Add backdrop blur/transparency for polish

**`src/components/chat/ChatPanel.tsx`**
- Center the message area with `max-w-2xl mx-auto` on the messages container and input
- Remove tight `max-w` constraints on assistant messages since the container handles width
- Adjust welcome screen to center properly in full width

### Visual result
```text
┌──────────────────────────────────────────┐
│ Nav │        Chat (centered, 720px)       │
│  C  │  ┌─────────────────────────┐  ┌──┐ │
│  📧 │  │ Messages...             │  │🃏│ │
│  📄 │  │                         │  │  │ │
│  👥 │  │                         │  │Fl│ │
│  ⚙️ │  │                         │  │oa│ │
│     │  │                         │  │t │ │
│     │  ├─────────────────────────┤  └──┘ │
│     │  │ Input...                │       │
│     │  └─────────────────────────┘       │
└──────────────────────────────────────────┘
```

### Implementation steps

1. **Update `Chat.tsx`** — Remove split layout, make chat full-width, add floating activity container with toggle state and an Activity button in the corner
2. **Update `ChatPanel.tsx`** — Add `max-w-2xl mx-auto w-full` to message scroll area and input bar so content centers within full width
3. **Refactor `ActivityPanel.tsx`** — Wrap in a floating card container (`fixed`/`absolute`, right-aligned, rounded-2xl, shadow-lg, border) with a close button header, scrollable content, and max dimensions

