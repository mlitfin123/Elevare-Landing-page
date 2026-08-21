import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const supabaseRoot = path.resolve(scriptDirectory, "..");
const linkedProjectPath = path.join(supabaseRoot, ".temp", "project-ref");
const expectedProjectPath = path.join(supabaseRoot, "marketplace-project.json");

if (!fs.existsSync(expectedProjectPath)) {
  console.error("The committed marketplace target configuration is missing. Migration aborted.");
  process.exit(1);
}

const expectedProject = JSON.parse(fs.readFileSync(expectedProjectPath, "utf8"));
const expectedProjectRef = typeof expectedProject.projectRef === "string"
  ? expectedProject.projectRef.trim()
  : "";
const environmentProjectRef = process.env.ELEVARE_MARKETPLACE_PROJECT_REF?.trim();

if (!expectedProjectRef) {
  console.error("The committed marketplace project reference is empty. Migration aborted.");
  process.exit(1);
}

if (environmentProjectRef && environmentProjectRef !== expectedProjectRef) {
  console.error("ELEVARE_MARKETPLACE_PROJECT_REF does not match the committed marketplace target. Migration aborted.");
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

console.log(`Verified the linked ${expectedProject.projectName ?? "Elevare marketplace"} Supabase project.`);
