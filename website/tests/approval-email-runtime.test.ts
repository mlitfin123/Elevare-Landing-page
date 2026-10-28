import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as bridge from "../../supabase/functions/_shared/communicationBridge.ts";
import * as email from "../../supabase/functions/professional-approval-email/email.ts";

async function runSender(recipientEmail: string) {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const providerRequests: Record<string, unknown>[] = [];
  const calls: string[] = [];
  const id = "00000000-0000-4000-8000-000000000001";
  const profile = { id, user_id: id, verification_status: "verified", profile_live: true, public_display_name: "Synthetic Coach" };
  const user = { email: recipientEmail, first_name: "Synthetic", preferred_locale: "en", auth_id: null };
  const client = {
    from(table: string) {
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        async single() { return { data: table === "users" ? user : profile, error: null }; },
        async maybeSingle() { return { data: profile, error: null }; },
      };
      return chain;
    },
    async rpc(name: string) {
      calls.push(name);
      if(name==='marketplace_email_start')return {data:true,error:null};
      if(name==='marketplace_email_outcome')return {data:false,error:null};
      if (name === "marketplace_claim_professional_approval_email") return {data: {claimed: true, event_id: id, lock_token: id, attempt_count: 1}, error: null};
      if (name === "marketplace_complete_professional_approval_email") return {data: {completed: true}, error: null};
      if (name === "marketplace_fail_professional_approval_email") return {data: {retry_available: true}, error: null};
      throw new Error("Unexpected RPC");
    },
  };
  const source = readFileSync(new URL("../../supabase/functions/professional-approval-email/index.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const env: Record<string, string> = { SUPABASE_URL: "https://synthetic.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key", RESEND_API_KEY: "synthetic-provider-key" };
  vm.runInNewContext(js, {
    exports: {}, Request, Response, atob,
    console: {info() {}, warn() {}, error() {}},
    Deno: { env: {get: (key: string) => env[key]}, serve: (callback: typeof handler) => { handler = callback; } },
    require: (name: string) => {
      if (name.startsWith("jsr:")) return {};
      if (name.startsWith("npm:@supabase/")) return {createClient: () => client};
      if (name.endsWith("/communicationBridge.ts")) return bridge;
      if (name === "./email.ts") return email;
      throw new Error("Unexpected import");
    },
    fetch: async (_url: string, options: {body: string}) => {
      providerRequests.push(JSON.parse(options.body));
      return new Response(JSON.stringify({id: "synthetic-message-id"}), {status: 200});
    },
  });
  assert.ok(handler);
  const payload = Buffer.from(JSON.stringify({role: "service_role"})).toString("base64url");
  const response = await handler(new Request("https://synthetic.invalid", {method: "POST", headers: {authorization: `Bearer synthetic.${payload}.synthetic`}, body: JSON.stringify({action: "retry", professional_id: id})}));
  return {result: await response.json(), providerRequests, calls};
}

test("actual approval sender validates a normal address, calls the mocked provider and records success", async () => {
  const {result, providerRequests, calls} = await runSender("sample.coach+test@example.com");
  assert.equal(result.email_status, "sent");
  assert.equal(providerRequests.length, 1);
  assert.deepEqual(providerRequests[0].to, ["sample.coach+test@example.com"]);
  assert.ok(calls.includes("marketplace_complete_professional_approval_email"));
  assert.ok(!calls.includes("marketplace_fail_professional_approval_email"));
});

test("actual sender rejects malformed addresses before the provider call", async () => {
  for (const value of ["", "missing-domain@", "two addresses@example.com", "missing-at.example.com"]) {
    const {result, providerRequests} = await runSender(value);
    assert.equal(result.email_status, "failed");
    assert.equal(result.error_code, "approval_recipient_email_invalid");
    assert.equal(providerRequests.length, 0);
  }
});
