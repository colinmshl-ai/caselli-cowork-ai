

# Improve Contacts Page

## File: `src/pages/Contacts.tsx`

### Contact cards with colored badges and timestamps
- Replace plain text type labels with colored badge spans using a `TYPE_COLORS` map:
  - Client = `bg-blue-500/10 text-blue-700`, Lead = `bg-green-500/10 text-green-700`, Vendor = `bg-orange-500/10 text-orange-700`, Agent = `bg-purple-500/10 text-purple-700`, Lender = `bg-amber-500/10 text-amber-700`
- Add relative time display ("Added 2 min ago") using `formatDistanceToNow` from date-fns on `created_at`

### Search improvements
- Extend the filter function to also search `notes` and `contact_type` fields (currently only searches name, email, company)

### Import button
- Add a disabled "Import" button next to "Add Contact" with a tooltip/badge saying "Coming soon"

### Linked deals count on cards
- Fetch deals alongside contacts (separate query or joined) and show deal count per contact by matching `client_name` or `client_email`

## File: `src/components/contacts/ContactSlideOver.tsx`

### Linked deals section
- When editing, fetch deals where `client_name` matches the contact's name or `client_email` matches email
- Display as a compact list with property address and stage badge

### Quick action buttons
- Add 3 buttons below the header when editing: "Draft email", "Add to deal", "Schedule follow-up"
- "Draft email" and "Schedule follow-up" navigate to `/chat?prompt=...` with pre-filled prompt
- "Add to deal" shows a toast "Coming soon" for now

### Recent activity
- Fetch from `task_history` where metadata contains the contact name/email, show as timeline

## Files modified: 2
- `src/pages/Contacts.tsx`
- `src/components/contacts/ContactSlideOver.tsx`

