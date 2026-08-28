import { GoogleAuth } from 'google-auth-library';
async function main() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  console.log('Client:', client);
  console.log('Project:', projectId);
}
main().catch(console.error);
