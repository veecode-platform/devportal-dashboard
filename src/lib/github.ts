import { Octokit } from "@octokit/rest";

let instance: Octokit | null = null;

export function getOctokit(token: string): Octokit {
  if (!instance) {
    instance = new Octokit({ auth: token });
  }
  return instance;
}

export function resetOctokit() {
  instance = null;
}

const ORG = "veecode-platform";

export async function validateToken(
  token: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.users.getAuthenticated();

    const { data: orgs } = await octokit.rest.orgs.listForAuthenticatedUser();
    if (!orgs.some((o) => o.login === ORG)) {
      return { valid: false, error: `You must be a member of the ${ORG} organization.` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid token or missing repo/workflow scopes." };
  }
}
