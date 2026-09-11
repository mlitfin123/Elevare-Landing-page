import { createHmac } from 'node:crypto';
export const jwtSecret='elevare-local-integration-test-secret-never-use-in-production';
export function token(role, sub) {
  const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const body=`${b64({alg:'HS256',typ:'JWT'})}.${b64({role,sub,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400})}`;
  return `${body}.${createHmac('sha256',jwtSecret).update(body).digest('base64url')}`;
}
export const testEnvironment={
  NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES:'true',
  NEXT_PUBLIC_SECOND_SUPABASE_URL:'http://127.0.0.1:55434',
  SECOND_SUPABASE_URL:'http://127.0.0.1:55434',
  NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY:token('anon'),
  SECOND_SUPABASE_SERVICE_ROLE_KEY:token('service_role'),
  PROFESSIONAL_REVALIDATION_SECRET:'local-integration-revalidation-secret-never-use-in-production',
};
