

## Smooth Page Transitions and Chat State Preservation

### 1. Fade transition on page content — `src/components/AppLayout.tsx`

Wrap `<Outlet />` (line 83) with a keyed fade container:

```tsx
<div className="animate-in fade-in duration-200" key={location.pathname}>
  <Outlet />
</div>
```

But for Chat preservation (point 2), we need a different approach — render all pages simultaneously and hide inactive ones via CSS. This conflicts with a simple keyed fade. The solution: render Chat always, use Outlet for the rest, and apply fade only to non-chat pages.

### 2. Preserve Chat state — `src/components/AppLayout.tsx` + `src/App.tsx`

**Approach**: Render Chat permanently inside AppLayout (always mounted), hide it with CSS when not on `/chat`. Use `<Outlet />` for the other routes, wrapped in the fade transition.

**AppLayout.tsx** changes:
- Import `Chat` from `@/pages/Chat`
- Render Chat always: `<div className={location.pathname === "/chat" ? "" : "hidden"}><Chat /></div>`
- Wrap Outlet in fade div, only show when NOT on `/chat`: `{location.pathname !== "/chat" && <div className="animate-in fade-in duration-200" key={location.pathname}><Outlet /></div>}`

**App.tsx** changes:
- Remove the `/chat` route from inside the AppLayout route group (line 42), since Chat is now rendered directly by AppLayout.

### 3. Mobile bottom nav active indicator animation — `src/components/AppLayout.tsx`

Add a sliding indicator dot under the active tab:
- Calculate active tab index from `navItems` based on `location.pathname`
- Add a positioned container (`relative`) around the mobile nav items
- Add an absolute-positioned dot/line that uses `transition-all duration-200` and `left` calculated from the active index (`left: calc(${activeIndex} * 25%)` since 4 items = 25% each)
- Add `transition-colors duration-150` to icon and label classes (already partially there with `transition-all duration-200`)

### 4. Improve Deals skeleton — `src/pages/Deals.tsx`

Update the loading skeleton (lines 164-178) to better match actual deal rows:
- Each skeleton row should include: address placeholder (w-2/5), client name (w-1/4), a small type badge (w-12), price (w-16), stage badge (w-20 rounded-full), and date (w-16)
- Match the `px-5 py-3 min-h-[44px]` of actual deal rows

### 5. Improve Contacts skeleton — `src/pages/Contacts.tsx`

Update loading skeleton (lines 181-191) to match contact rows:
- Name (w-1/3), email (w-1/4), type badge (w-16 rounded-full)
- Match `px-5 py-3` of actual rows

### 6. Improve Settings skeleton — `src/pages/Settings.tsx`

Already reasonable (lines 150-170). Minor tweak: match the `max-w-2xl` container and section spacing more precisely.

### Files modified:
- `src/components/AppLayout.tsx` — fade transitions, chat persistence, mobile nav indicator
- `src/App.tsx` — remove `/chat` child route
- `src/pages/Deals.tsx` — skeleton refinement
- `src/pages/Contacts.tsx` — skeleton refinement

