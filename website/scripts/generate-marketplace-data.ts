// Retained as a clear failure for old build hooks or operational runbooks.
// Professional data is served by lib/marketplace.ts from the restricted runtime
// Supabase view. Never generate a public JSON file that shadows the route handler.
throw new Error("Professional snapshots are retired. Use runtime Supabase publication and targeted revalidation; see docs/professional-runtime-operations.md.");
export {};
