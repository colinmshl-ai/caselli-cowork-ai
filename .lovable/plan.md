

## Plan: Fix add_contact persistence in chat edge function

### Changes to `supabase/functions/chat/index.ts`

#### 1. Update tool definition (lines 118-128)
Add `enum` to `contact_type` property:
```
contact_type: { type: "string", enum: ["client", "lead", "vendor", "agent", "lender", "other"] },
```

#### 2. Replace `add_contact` case (lines 303-313)
- Add required field validation for `full_name`
- Whitelist columns explicitly instead of spreading `toolInput`
- Add error logging
- Return `success: true/false` flag so AI doesn't falsely report success

```typescript
case "add_contact": {
  if (!toolInput.full_name) {
    return { result: { error: "Contact name is required" }, taskType: "contact_updated", taskDescription: "Failed to add contact: no name provided" };
  }
  const contactData = {
    user_id: userId,
    full_name: toolInput.full_name,
    email: toolInput.email || null,
    phone: toolInput.phone || null,
    contact_type: toolInput.contact_type || "client",
    company: toolInput.company || null,
    notes: toolInput.notes || null,
  };
  const { data, error } = await adminClient
    .from("contacts")
    .insert(contactData)
    .select()
    .single();
  if (error) console.error("add_contact failed:", error.message, { toolInput });
  return {
    result: error ? { error: error.message, success: false } : { ...data, success: true },
    taskType: "contact_updated",
    taskDescription: error ? `Failed to add contact: ${error.message}` : `Added contact: ${toolInput.full_name}`,
  };
}
```

No other files changed.

