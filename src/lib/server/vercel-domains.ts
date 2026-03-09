/**
 * Vercel Domains API Integration
 *
 * Manages adding and removing custom domains from Vercel projects
 */

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified?: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

interface VercelErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface AddVercelDomainResult {
  success: boolean;
  domain?: string;
  verified?: boolean;
  error?: string;
  needsVerification?: boolean;
}

/**
 * Adds a custom domain to the Vercel project
 */
export async function addVercelDomain(domain: string): Promise<AddVercelDomainResult> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken) {
    return {
      success: false,
      error: 'VERCEL_API_TOKEN is not configured',
    };
  }

  if (!vercelProjectId) {
    return {
      success: false,
      error: 'VERCEL_PROJECT_ID is not configured',
    };
  }

  try {
    // Construct API URL with optional team ID
    let apiUrl = `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`;
    if (vercelTeamId) {
      apiUrl += `?teamId=${vercelTeamId}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    const data = await response.json() as VercelDomainResponse | VercelErrorResponse;

    if (!response.ok) {
      const errorData = data as VercelErrorResponse;

      // Check if domain already exists
      if (errorData.error?.code === 'domain_already_in_use' ||
          errorData.error?.code === 'domain_already_exists') {
        return {
          success: true,
          domain,
          verified: false,
          needsVerification: true,
        };
      }

      return {
        success: false,
        error: errorData.error?.message || `Failed to add domain: ${response.status}`,
      };
    }

    const domainData = data as VercelDomainResponse;

    return {
      success: true,
      domain: domainData.name,
      verified: domainData.verified || false,
      needsVerification: !domainData.verified,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add domain to Vercel',
    };
  }
}

/**
 * Removes a custom domain from the Vercel project
 */
export async function removeVercelDomain(domain: string): Promise<{ success: boolean; error?: string }> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken || !vercelProjectId) {
    return {
      success: false,
      error: 'Vercel configuration is missing',
    };
  }

  try {
    let apiUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`;
    if (vercelTeamId) {
      apiUrl += `?teamId=${vercelTeamId}`;
    }

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json() as VercelErrorResponse;
      return {
        success: false,
        error: errorData.error?.message || `Failed to remove domain: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove domain from Vercel',
    };
  }
}

/**
 * Checks if a domain exists in the Vercel project
 */
export async function checkVercelDomain(domain: string): Promise<{ exists: boolean; verified?: boolean; error?: string }> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken || !vercelProjectId) {
    return {
      exists: false,
      error: 'Vercel configuration is missing',
    };
  }

  try {
    let apiUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`;
    if (vercelTeamId) {
      apiUrl += `?teamId=${vercelTeamId}`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (response.status === 404) {
      return { exists: false };
    }

    if (!response.ok) {
      const errorData = await response.json() as VercelErrorResponse;
      return {
        exists: false,
        error: errorData.error?.message || `Failed to check domain: ${response.status}`,
      };
    }

    const data = await response.json() as VercelDomainResponse;

    return {
      exists: true,
      verified: data.verified || false,
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Failed to check domain',
    };
  }
}
