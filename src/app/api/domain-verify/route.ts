/**
 * Domain Verification API
 *
 * Handles domain verification through Vercel API
 * Adds custom domains to Vercel project and verifies DNS configuration
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL mutation to update domain verification status
 */
const UPDATE_DOMAIN_VERIFICATION = `
  mutation UpdateDomainVerification(
    $restaurant_id: uuid!
    $custom_domain: String
  ) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: {
        custom_domain: $custom_domain
        updated_at: "now()"
      }
    ) {
      restaurant_id
      custom_domain
    }
  }
`;

const UPSERT_DOMAIN_CONFIG = `
  mutation UpsertDomainConfig(
    $restaurant_id: uuid!
    $config: jsonb!
  ) {
    insert_templates(
      objects: {
        restaurant_id: $restaurant_id
        category: "DomainConfig"
        name: "domain_status"
        config: $config
        menu_items: []
        is_deleted: false
      }
      on_conflict: {
        constraint: templates_restaurant_id_category_name_key
        update_columns: [config, updated_at]
      }
    ) {
      returning {
        template_id
        config
      }
    }
  }
`;

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * Add domain to Vercel project
 */
async function addDomainToVercel(domain: string) {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !projectId) {
    throw new Error('Vercel API token or project ID not configured');
  }

  try {
    // First, try to add the domain to the project
    const addResponse = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    const addResult = await addResponse.json();

    if (!addResponse.ok) {
      // If domain already exists, that's okay
      if (addResult.error?.code === 'domain_already_in_use') {
        console.log(`Domain ${domain} already exists in Vercel project`);
      } else {
        throw new Error(`Failed to add domain to Vercel: ${addResult.error?.message || 'Unknown error'}`);
      }
    }

    // Check domain configuration
    const configResponse = await fetch(`https://api.vercel.com/v6/domains/${domain}/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    const configResult = await configResponse.json();

    if (!configResponse.ok) {
      throw new Error(`Failed to get domain config: ${configResult.error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      verified: configResult.configuredBy === 'CNAME' || configResult.configuredBy === 'A',
      config: configResult,
    };
  } catch (error) {
    console.error('Vercel API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Vercel API error',
    };
  }
}

/**
 * Verify domain DNS configuration
 */
async function verifyDomainDNS(domain: string) {
  try {
    // Check if domain resolves correctly
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      redirect: 'manual',
    });

    // If we get any response (even 404), DNS is working
    return {
      success: true,
      verified: response.status < 500, // Any non-server error means DNS is working
    };
  } catch (error) {
    // DNS resolution failed
    return {
      success: false,
      verified: false,
      error: 'DNS resolution failed',
    };
  }
}

/**
 * POST endpoint to verify domain
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, domain } = body;

    if (!restaurant_id || !domain) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id and domain are required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Add domain to Vercel project
    const vercelResult = await addDomainToVercel(domain);

    if (!vercelResult.success) {
      return NextResponse.json({
        success: false,
        error: `Vercel configuration failed: ${vercelResult.error}`,
      });
    }

    // Verify DNS configuration
    const dnsResult = await verifyDomainDNS(domain);

    const isVerified = vercelResult.verified && dnsResult.verified;
    const status = isVerified ? 'active' : 'pending';

    // Update database to confirm domain is set
    await graphqlRequest(UPDATE_DOMAIN_VERIFICATION, {
      restaurant_id,
      custom_domain: domain,
    });

    // Save domain configuration with published status
    const domainConfigData = {
      published: isVerified,
      sslEnabled: true,
      wwwRedirect: true,
      httpsRedirect: true,
      verificationToken: isVerified ? null : `antler-foods-${Date.now()}`,
      lastVerified: isVerified ? new Date().toISOString() : null,
    };

    await graphqlRequest(UPSERT_DOMAIN_CONFIG, {
      restaurant_id,
      config: domainConfigData,
    });

    return NextResponse.json({
      success: true,
      verified: isVerified,
      status,
      message: isVerified
        ? 'Domain verified successfully!'
        : 'Domain added to Vercel. Please configure DNS records and wait for propagation.',
      vercelConfig: vercelResult.config,
    });
  } catch (error) {
    console.error('Error verifying domain:', error);

    // Log error but don't update database since we don't have error status fields
    console.error('Domain verification failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}