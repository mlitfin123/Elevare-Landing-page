import fs from "node:fs";
import path from "node:path";

const supabaseRoot = path.resolve(process.cwd(), process.cwd().endsWith("website") ? "../supabase" : "supabase");
const linkedProjectPath = path.join(supabaseRoot, ".temp", "project-ref");
const expectedProjectRef = process.env.ELEVARE_MARKETPLACE_PROJECT_REF?.trim();

if (!expectedProjectRef) {
  console.error("ELEVARE_MARKETPLACE_PROJECT_REF is required. No migration command was run.");
  process.exit(1);
}

if (!fs.existsSync(linkedProjectPath)) {
  console.error("No linked Supabase project was found. Link the intended marketplace project, then verify again.");
  process.exit(1);
}

const linkedProjectRef = fs.readFileSync(linkedProjectPath, "utf8").trim();
if (linkedProjectRef !== expectedProjectRef) {
  console.error("The linked Supabase project does not match ELEVARE_MARKETPLACE_PROJECT_REF. Migration aborted.");
  process.exit(1);
}

console.log("Verified the linked Elevare marketplace Supabase project.");
