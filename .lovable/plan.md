

## Polish Welcome State and Input Area

### File: `src/components/chat/ChatPanel.tsx`

#### 1. Welcome header (lines 747-754)
Remove "What can I help you with today?" line. Add subtitle "Your AI coworker for real estate".

#### 2. Starter prompt cards — empty state (lines 755-771)
Replace grid layout with horizontal flex-wrap pills. Remove icons. Change to 3 prompts:
- "Add a new listing to my pipeline"
- "Draft social posts for my active listings"
- "Review my deadlines this week"

Style: `rounded-xl border border-border/60 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 hover:border-border hover:scale-[1.02] transition-all cursor-pointer`

#### 3. Starter prompts below welcome message (lines 839-858)
Same changes — 3 pills in flex-wrap, no icons, same styling.

#### 4. Input placeholder (line 898)
Change from `"Ask Caselli Cowork anything..."` to `"Message Caselli..."`.

#### 5. Keyboard shortcut hint (after line 920, inside the input container)
Add `<span className="text-[10px] text-muted-foreground/50 self-center ml-1 hidden md:inline">⌘K to focus</span>` next to the input area.

#### 6. Remove unused icon imports
Remove `Home, Camera, BarChart3, Users` from the lucide import since starter cards no longer use icons.

