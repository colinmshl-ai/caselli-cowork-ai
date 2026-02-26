

# Make the Activity Panel Show Real Activity Data

## Current State
- The edge function **already inserts** into `task_history` (lines 660-665) after each tool call, but the insert is fire-and-forget (no `await`), so failures are silent.
- The ActivityPanel already queries `task_history` with a 10s refetch interval.
- Stats are computed from real data but some logic doesn't match the user's intent.

## Changes

### 1. `supabase/functions/chat/index.ts` — Await the task_history insert (line 660)
Add `await` to the insert call so failures are logged and data is guaranteed to be written before the response completes.

```typescript
// Line 660: add await and .then() error logging
await adminClient.from("task_history").insert({
  user_id: userId,
  task_type: taskType,
  description: taskDescription,
  metadata: { tool: tool.name, input: tool.input },
}).then(({ error }) => { if (error) console.error("task_history insert error:", error); });
```

### 2. `src/components/chat/ActivityPanel.tsx` — Fix stats logic and add activity icons

**Stats updates:**
- **Tasks Completed**: Change from "this week" to "today" (`startOfDay` filter)
- **New Leads**: Query contacts where `contact_type = 'lead'` and `created_at` within last 7 days, instead of deals with `stage = 'lead'`

**Add a contacts query** for the New Leads stat:
```typescript
const { data: recentLeadContacts = [] } = useQuery({
  queryKey: ["activity-lead-contacts"],
  queryFn: async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .eq("contact_type", "lead")
      .gte("created_at", sevenDaysAgo);
    if (error) throw error;
    return data;
  },
  enabled: !!user,
  refetchInterval: 30000,
});
```

**Updated stats:**
```typescript
const tasksToday = taskHistory.filter(t => new Date(t.created_at) >= startOfToday).length;
const newLeads = recentLeadContacts.length;
const stats = [
  { label: "Active Deals", value: activeDeals },
  { label: "Deadlines This Week", value: deadlinesThisWeek },
  { label: "Tasks Today", value: tasksToday },
  { label: "New Leads", value: newLeads },
];
```

**Add icons** to Recent Activity entries based on `task_type`:
- Map task types to lucide icons (e.g., `deal_create` → `Home`, `content_drafted` → `FileText`, `contact_updated` → `UserPlus`, `deal_update` → `RefreshCw`, `deadline_check` → `Clock`, default → `Activity`)
- Replace the plain dot with the mapped icon, sized at 14px

### Files modified: 2
- `supabase/functions/chat/index.ts` — await task_history insert
- `src/components/chat/ActivityPanel.tsx` — fix stats logic, add lead contacts query, add activity type icons

