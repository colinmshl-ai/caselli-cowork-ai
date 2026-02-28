

## Fix ConversationalRenderer: Remove Closing Question Theft + Tighten Suggestion Detection

### Change 1: Remove closing question extraction (lines 14-116)

- Remove `"closing_question"` from the `Segment` type union (line 15)
- Delete `let closingQuestion = ""` (line 28)
- Replace lines 72-87 (closing question detection) with simple: push all remaining markdown as-is
- Remove closing question push (lines 111-114)
- Remove the `case "closing_question"` render block (lines 186-194)

### Change 2: Stricter suggestion detection (lines 41-67)

- Add `^` anchor to the regex so it only matches lines **starting** with the trigger phrase
- After collecting suggestion items, check: if fewer than 2 items found, treat the header + items as regular markdown instead of a suggestions section
- Specifically: after the for-loop ends, if `suggestionItems.length < 2`, push `suggestionsHeader` and the single item back into markdown lines and clear `suggestionItems`

### File modified
- `src/components/chat/ConversationalRenderer.tsx`

