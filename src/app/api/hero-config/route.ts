/**
 * Hero Configuration API with GraphQL (Hasura)
 * 
 * This API route fetches and updates hero configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 * 
 * Structure:
 * - name: layout type (e.g., "centered-large")
 * - category: "Hero"
 * - config: complete hero configuration object
 * - menu_items: not used for hero (empty array)
 */

import { NextResponse } from 'next/server';
import type { HeroConfig, HeroConfigResponse } from '@/types/hero.types';
import { DEFAULT_HERO_CONFIG } from '@/types/hero.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

// Restaurant ID must be provided dynamically via query parameters or domain lookup

/**
 * GraphQL query to fetch hero configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_HERO_CONFIG = `
  query GetHeroConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Hero"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      menu_items
      name
      restaurant_id
      template_id
      updated_at
    }
  }
`;

/**
 * GraphQL mutation to mark current template as deleted
 * Uses template_id as primary key
 */
const MARK_AS_DELETED = `
  mutation MarkAsDeleted($template_id: uuid!) {
    update_templates_by_pk(
      pk_columns: {template_id: $template_id},
      _set: {is_deleted: true, updated_at: "now()"}
    ) {
      template_id
      is_deleted
    }
  }
`;

/**
 * GraphQL mutation to insert new template
 */
const INSERT_TEMPLATE = `
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb!, $page_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        page_id: $page_id,
        is_deleted: false
      }
    ) {
      restaurant_id
      template_id
      name
      category
      config
      menu_items
      page_id
      created_at
      updated_at
    }
  }
`;

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest(query: string, variables?: any) {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

/**
 * GET endpoint to fetch hero configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params - required parameter
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');
    const urlSlug = searchParams.get('url_slug');
    let pageId = searchParams.get('page_id');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        // Use local GraphQL request function to avoid nhost client issues
        console.log('[Hero Config] Looking up domain:', domain);
        
        // Query for restaurants matching the domain
        const GET_RESTAURANT_BY_DOMAIN = `
          query GetRestaurantByDomain($domain: String!) {
            restaurants(
              where: {
                _or: [
                  { custom_domain: { _eq: $domain } },
                  { staging_domain: { _eq: $domain } }
                ],
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              restaurant_id
              name
              custom_domain
              staging_domain
              is_deleted
            }
          }
        `;
        
        const domainData = await graphqlRequest(GET_RESTAURANT_BY_DOMAIN, {
          domain: domain,
        });
        
        console.log('[Hero Config] Domain lookup result for', domain, ':', JSON.stringify(domainData, null, 2));
        
        if (domainData.restaurants && domainData.restaurants.length > 0) {
          const restaurant = domainData.restaurants[0];
          if (!restaurant.is_deleted) {
            restaurantId = restaurant.restaurant_id;
            console.log('[Hero Config] Found restaurant for domain:', domain, '->', restaurantId);
          } else {
            console.log('[Hero Config] Restaurant found but is deleted:', restaurant);
          }
        } else {
          console.log('[Hero Config] No restaurant found for domain:', domain);
          
          // Try individual queries to see which field might be the issue
          const GET_BY_STAGING = `
            query GetByStaging($domain: String!) {
              restaurants(
                where: {
                  staging_domain: { _eq: $domain },
                  is_deleted: { _eq: false }
                },
                limit: 1
              ) {
                restaurant_id
                staging_domain
              }
            }
          `;
          
          const GET_BY_CUSTOM = `
            query GetByCustom($domain: String!) {
              restaurants(
                where: {
                  custom_domain: { _eq: $domain },
                  is_deleted: { _eq: false }
                },
                limit: 1
              ) {
                restaurant_id
                custom_domain
              }
            }
          `;
          
          try {
            const stagingResult = await graphqlRequest(GET_BY_STAGING, { domain });
            console.log('[Hero Config] Staging domain query result:', JSON.stringify(stagingResult, null, 2));
            
            if (stagingResult.restaurants && stagingResult.restaurants.length > 0) {
              restaurantId = stagingResult.restaurants[0].restaurant_id;
              console.log('[Hero Config] Found restaurant via staging_domain:', restaurantId);
            }
          } catch (stagingError) {
            console.error('[Hero Config] Error querying staging_domain:', stagingError);
          }
          
          if (!restaurantId) {
            try {
              const customResult = await graphqlRequest(GET_BY_CUSTOM, { domain });
              console.log('[Hero Config] Custom domain query result:', JSON.stringify(customResult, null, 2));
              
              if (customResult.restaurants && customResult.restaurants.length > 0) {
                restaurantId = customResult.restaurants[0].restaurant_id;
                console.log('[Hero Config] Found restaurant via custom_domain:', restaurantId);
              }
            } catch (customError) {
              console.error('[Hero Config] Error querying custom_domain:', customError);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant ID by domain:', error);
        // Continue without restaurant ID - will be validated below
      }
    }

    // Validate that restaurant_id is provided
    if (!restaurantId) {
      const errorResponse = {
        success: false,
        data: DEFAULT_HERO_CONFIG,
        error: 'restaurant_id is required. Provide it as a query parameter or ensure the domain is properly configured.'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // If url_slug is provided, fetch page_id from web_pages table
    if (urlSlug && !pageId) {
      try {
        const GET_PAGE_BY_SLUG = `
          query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
            web_pages(
              where: {
                restaurant_id: { _eq: $restaurant_id },
                url_slug: { _eq: $url_slug },
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              page_id
              url_slug
              name
              restaurant_id
            }
          }
        `;

        console.log('[Hero Config] Looking up page for url_slug:', urlSlug, 'restaurant_id:', restaurantId);

        const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
          restaurant_id: restaurantId,
          url_slug: urlSlug,
        });

        console.log('[Hero Config] Page lookup result:', JSON.stringify(pageData, null, 2));

        if (pageData.web_pages && pageData.web_pages.length > 0) {
          pageId = pageData.web_pages[0].page_id;
          console.log('[Hero Config] Found page_id for', urlSlug, ':', pageId);
        } else {
          console.log('[Hero Config] No page found for url_slug:', urlSlug);
        }
      } catch (error) {
        console.error('Error fetching page_id by url_slug:', error);
        // Continue without page_id - will use general hero config
      }
    }

    // Use page-specific query if page_id is available, otherwise use general query
    const data = pageId
      ? await graphqlRequest(`
          query GetHeroConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "Hero"},
                is_deleted: {_eq: false}
              },
              order_by: {created_at: desc},
              limit: 1
            ) {
              category
              config
              created_at
              is_deleted
              menu_items
              name
              restaurant_id
              template_id
              updated_at
              page_id
            }
          }
        `, {
          restaurant_id: restaurantId,
          page_id: pageId,
        })
      : await graphqlRequest(GET_HERO_CONFIG, {
          restaurant_id: restaurantId,
        });

    console.log('[Hero Config] Template query result:', JSON.stringify(data, null, 2));

    if (!data.templates || data.templates.length === 0) {
      // Return default config if template doesn't exist
      const response: HeroConfigResponse = {
        success: true,
        data: DEFAULT_HERO_CONFIG,
      };

      return NextResponse.json(response);
    }

    const template = data.templates[0]; // Get most recent non-deleted template
    
    // The config field contains the complete hero configuration
    const config: HeroConfig = {
      ...DEFAULT_HERO_CONFIG,
      ...template.config,
      layout: template.name, // name field contains layout type
      restaurant_id: restaurantId,
    };

    const response: HeroConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching hero config:', error);

    const errorResponse: HeroConfigResponse = {
      success: false,
      data: DEFAULT_HERO_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update hero configuration
 * Marks current template as deleted and inserts new one
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get restaurant_id - must be provided in request body
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }

    // Get page_id directly from request body
    const pageId = body.page_id || null;

    // Step 1: Get current template to mark as deleted (consider page_id if provided)
    const currentData = pageId
      ? await graphqlRequest(`
          query GetHeroConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "Hero"},
                is_deleted: {_eq: false}
              },
              order_by: {created_at: desc},
              limit: 1
            ) {
              template_id
              category
              page_id
            }
          }
        `, {
          restaurant_id: restaurantId,
          page_id: pageId,
        })
      : await graphqlRequest(GET_HERO_CONFIG, {
          restaurant_id: restaurantId,
        });

    // Step 2: Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];

      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }

    // Prepare hero configuration
    const { restaurant_id, layout, page_id: _pageId, ...configData } = body;
    const name = layout || 'centered-large'; // layout goes to name field

    // The entire hero config (except layout, page_id) goes into the config field
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    console.log('[Hero Config POST] Saving hero with page_id:', pageId);

    // Step 3: Insert new template with page_id
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Hero',
      config: config,
      menu_items: [], // Hero doesn't use menu_items
      page_id: pageId,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    
    // Transform back to HeroConfig
    const responseConfig: HeroConfig = {
      ...template.config,
      layout: template.name,
      restaurant_id: restaurantId,
    };

    const response: HeroConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating hero config:', error);

    const errorResponse: HeroConfigResponse = {
      success: false,
      data: DEFAULT_HERO_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}