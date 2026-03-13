import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { addVercelDomain } from '@/lib/server/vercel-domains';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const DEFAULT_STAGING_DOMAIN_SUFFIX = '.vercel.app';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: 'bedrock-api-key',
    secretAccessKey: process.env.AWS_BEARER_TOKEN_BEDROCK || '',
  },
});

const DEFAULT_SYSTEM_PAGES = [
  { urlSlug: 'home', name: 'Home' },
  { urlSlug: 'about', name: 'About' },
  { urlSlug: 'contact', name: 'Contact' },
  { urlSlug: 'menu', name: 'Menu' },
] as const;

interface Page {
  url_slug: string;
  [key: string]: unknown;
}

interface GetPagesResponse {
  web_pages: Page[];
}

interface UpdateRestaurantResponse {
  update_restaurants_by_pk: {
    restaurant_id: string;
  } | null;
}

interface InsertPageResponse {
  insert_web_pages_one: {
    page_id: string;
  } | null;
}

interface ThemeSection {
  id: string;
  type: string;
  name: string;
  order?: number;
  order_index?: number;
  style?: any;
}

interface OtherPageSection {
  id: string;
  name: string;
  type: string;
  order_index: number;
  config?: any; // Full configuration object for the section (e.g., hero config, custom section config)
}

interface Theme {
  theme_id: string;
  sections: ThemeSection[] | Record<string, ThemeSection>;
  other_page_sections?: Array<{
    [pageName: string]: OtherPageSection[];
  }>;
}

interface GetThemeResponse {
  themes_by_pk: Theme | null;
}

interface InsertTemplateResponse {
  insert_templates_one: {
    template_id: string;
  } | null;
}

function buildDefaultStagingDomain(restaurantName: string) {
  const normalizedLabel = restaurantName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  const base = normalizedLabel || 'restaurant';
  return `${base}-staging${DEFAULT_STAGING_DOMAIN_SUFFIX}`;
}

async function getExistingPages(restaurantId: string): Promise<string[]> {
  const query = `
    query GetPages($restaurant_id: uuid!) {
      web_pages(where: { restaurant_id: { _eq: $restaurant_id }, is_deleted: { _eq: false } }) {
        url_slug
      }
    }
  `;

  const data = await adminGraphqlRequest<GetPagesResponse>(query, {
    restaurant_id: restaurantId,
  });

  return data.web_pages
    .map((page) => page.url_slug?.trim().toLowerCase())
    .filter((slug): slug is string => Boolean(slug));
}

async function updateRestaurantData(
  restaurantId: string,
  stagingDomain: string
) {
  const mutation = `
    mutation UpdateRestaurant($restaurantId: uuid!, $stagingDomain: String!) {
      update_restaurants_by_pk(
        pk_columns: { restaurant_id: $restaurantId }
        _set: { staging_domain: $stagingDomain }
      ) {
        restaurant_id
      }
    }
  `;

  const data = await adminGraphqlRequest<UpdateRestaurantResponse>(mutation, {
    restaurantId,
    stagingDomain,
  });

  if (!data.update_restaurants_by_pk) {
    throw new Error('Failed to update restaurant');
  }
}

const GET_THEME_BY_ID = `
  query GetTheme($theme_id: uuid!) {
    themes_by_pk(theme_id: $theme_id) {
      theme_id
      sections
      other_page_sections
    }
  }
`;

const INSERT_TEMPLATE = `
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb, $page_id: uuid, $order_index: numeric, $ref_template_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        page_id: $page_id,
        order_index: $order_index,
        is_deleted: false,
        is_published: false,
        ref_template_id: $ref_template_id
      }
    ) {
      template_id
    }
  }
`;

function generateSEOMetadata(restaurantName: string, pageSlug: string, pageName: string) {
  const cleanRestaurantName = restaurantName.trim();

  const seoTemplates = {
    home: {
      meta_title: `${cleanRestaurantName} - Best Restaurant Experience | Order Online`,
      meta_description: `Welcome to ${cleanRestaurantName}! Experience exceptional dining with our carefully crafted menu. Order online for delivery or visit us for an unforgettable meal.`
    },
    about: {
      meta_title: `About ${cleanRestaurantName} - Our Story & Mission`,
      meta_description: `Learn about ${cleanRestaurantName}'s story, our passion for great food, and commitment to exceptional dining experiences. Discover what makes us special.`
    },
    contact: {
      meta_title: `Contact ${cleanRestaurantName} - Location, Hours & Reservations`,
      meta_description: `Get in touch with ${cleanRestaurantName}. Find our location, hours, phone number, and make reservations. We're here to serve you!`
    },
    menu: {
      meta_title: `${cleanRestaurantName} Menu - Fresh, Delicious Food | Order Now`,
      meta_description: `Explore ${cleanRestaurantName}'s delicious menu featuring fresh ingredients and expertly prepared dishes. View our full menu and order online today!`
    }
  };

  // Get SEO data for the specific page or use default
  const seoData = seoTemplates[pageSlug as keyof typeof seoTemplates] || {
    meta_title: `${pageName} - ${cleanRestaurantName}`,
    meta_description: `${pageName} page for ${cleanRestaurantName}. Discover more about our restaurant and what we have to offer.`
  };

  return seoData;
}

async function createSystemPage(
  restaurantId: string,
  urlSlug: string,
  name: string,
  restaurantName: string
) {
  const mutation = `
    mutation InsertPage($object: web_pages_insert_input!) {
      insert_web_pages_one(object: $object) {
        page_id
      }
    }
  `;

  // Generate SEO metadata for this page
  const seoMetadata = generateSEOMetadata(restaurantName, urlSlug, name);

  const data = await adminGraphqlRequest<InsertPageResponse>(mutation, {
    object: {
      url_slug: urlSlug,
      name: name,
      is_deleted: false,
      meta_title: seoMetadata.meta_title,
      meta_description: seoMetadata.meta_description,
      restaurant_id: restaurantId,
      is_system_page: true,
      show_on_navbar: true,
      show_on_footer: true,
      keywords: null,
      og_image: null,
      published: true,
    },
  });

  if (!data.insert_web_pages_one) {
    throw new Error(`Failed to create page: ${name}`);
  }
}

async function ensureDefaultSystemPagesForRestaurant(restaurantId: string, restaurantName: string) {
  const existingSlugs = new Set(await getExistingPages(restaurantId));

  for (const page of DEFAULT_SYSTEM_PAGES) {
    if (existingSlugs.has(page.urlSlug)) {
      continue;
    }

    await createSystemPage(restaurantId, page.urlSlug, page.name, restaurantName);
  }
}

async function getHomePageId(restaurantId: string): Promise<string | null> {
  return getPageIdBySlug(restaurantId, 'home');
}

async function getPageIdBySlug(restaurantId: string, urlSlug: string): Promise<string | null> {
  const query = `
    query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
      web_pages(where: { restaurant_id: { _eq: $restaurant_id }, url_slug: { _eq: $url_slug }, is_deleted: { _eq: false } }) {
        page_id
      }
    }
  `;

  const data = await adminGraphqlRequest<{ web_pages: Array<{ page_id: string }> }>(query, {
    restaurant_id: restaurantId,
    url_slug: urlSlug,
  });

  return data.web_pages.length > 0 ? data.web_pages[0].page_id : null;
}

/**
 * Fetch a media image for the restaurant
 */
async function getRestaurantMedia(restaurantId: string) {
  const query = `
    query GetRestaurantMedia($restaurant_id: uuid!) {
      medias(
        where: {
          restaurant_id: { _eq: $restaurant_id },
          is_deleted: { _eq: false },
          is_hidden: { _eq: false },
          type: { _eq: "image" }
        },
        limit: 1,
        order_by: { created_at: asc }
      ) {
        file_id
        alt_text
      }
    }
  `;

  const data = await adminGraphqlRequest<{
    medias: Array<{
      file_id: string;
      alt_text?: string | null;
    }>
  }>(query, { restaurant_id: restaurantId });

  if (data.medias && data.medias.length > 0) {
    const media = data.medias[0];
    return {
      url: `/api/image-proxy?fileId=${media.file_id}`,
      alt: media.alt_text || 'Section image',
    };
  }

  return null;
}

/**
 * Fetch restaurant details for AI content generation
 */
async function getRestaurantDetails(restaurantId: string) {
  const query = `
    query GetRestaurantDetails($restaurant_id: uuid!) {
      restaurants_by_pk(restaurant_id: $restaurant_id) {
        name
        business_type
        cuisine_types
        address
        city
        state
        country
      }
    }
  `;

  const data = await adminGraphqlRequest<{
    restaurants_by_pk: {
      name: string;
      business_type?: string;
      cuisine_types?: string[] | null;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    } | null
  }>(query, { restaurant_id: restaurantId });

  return data.restaurants_by_pk;
}

/**
 * Generate custom section content using Amazon Bedrock AI
 * @param restaurantId - Restaurant ID
 * @param pageName - Page name (e.g., 'about', 'contact')
 * @param sectionName - Section name (e.g., 'Mission', 'Values', 'Team')
 */
async function generateCustomSectionContent(
  restaurantId: string,
  pageName: string,
  sectionName: string
) {
  try {
    // Check if Bedrock is configured
    if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
      console.log('AWS Bedrock not configured, skipping AI content generation');
      return null;
    }

    // Fetch restaurant details
    const restaurant = await getRestaurantDetails(restaurantId);
    if (!restaurant) {
      console.log('Restaurant not found, skipping AI content generation');
      return null;
    }

    // Build context for the AI prompt
    const contextParts = [];
    if (restaurant.business_type) contextParts.push(restaurant.business_type);
    if (restaurant.cuisine_types && Array.isArray(restaurant.cuisine_types) && restaurant.cuisine_types.length > 0) {
      contextParts.push(`${restaurant.cuisine_types.join(', ')} cuisine`);
    }

    const locationInfo = [restaurant.city, restaurant.state, restaurant.country]
      .filter(Boolean)
      .join(', ');
    if (locationInfo) contextParts.push(`located in ${locationInfo}`);

    const context = contextParts.length > 0 ? ` - ${contextParts.join(', ')}` : '';

    // Create prompt for custom section on about page
    const prompt = `Generate compelling custom section content for the "${sectionName}" section on the About page of a restaurant website.

Restaurant Details:
- Name: ${restaurant.name}${context}

Requirements:
- Write a headline (1-3 words only) that captures the essence of "${sectionName}" (e.g., for "Mission": "Our Mission", "Our Purpose"; for "Values": "Core Values", "What We Believe")
- Write a subheadline (4-6 words) that provides emotional context
- Write a description (2-3 sentences, max 180 characters) that elaborates on the "${sectionName}" theme
- Use professional but warm tone
- Make it authentic and compelling
- Focus on the restaurant's unique story and values
- Create content based on the restaurant type, cuisine, and location provided above

Generate the content in JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`;

    // Prepare the request for Claude 3 Haiku
    const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    // Invoke the model
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
      throw new Error('Invalid response from Bedrock model');
    }

    const generatedText = responseBody.content[0].text.trim();

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Bedrock response');
    }

    const generatedContent = JSON.parse(jsonMatch[0]);

    console.log(`✅ Generated AI content for ${sectionName} custom section on ${pageName} page`);

    return {
      headline: generatedContent.headline || sectionName,
      subheadline: generatedContent.subheadline || '',
      description: generatedContent.description || '',
    };

  } catch (error) {
    console.error('Error generating custom section content with Bedrock:', error);
    return null;
  }
}

/**
 * Generate hero section content using Amazon Bedrock AI
 * @param restaurantId - Restaurant ID
 * @param pageName - Page name (e.g., 'about', 'contact')
 * @param layoutId - Hero layout ID
 */
async function generateHeroContent(
  restaurantId: string,
  pageName: string,
  layoutId: string
) {
  try {
    // Check if Bedrock is configured
    if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
      console.log('AWS Bedrock not configured, skipping AI content generation');
      return null;
    }

    // Fetch restaurant details
    const restaurant = await getRestaurantDetails(restaurantId);
    if (!restaurant) {
      console.log('Restaurant not found, skipping AI content generation');
      return null;
    }

    // Build context for the AI prompt
    const contextParts = [];
    if (restaurant.business_type) contextParts.push(restaurant.business_type);
    if (restaurant.cuisine_types && Array.isArray(restaurant.cuisine_types) && restaurant.cuisine_types.length > 0) {
      contextParts.push(`${restaurant.cuisine_types.join(', ')} cuisine`);
    }

    const locationInfo = [restaurant.city, restaurant.state, restaurant.country]
      .filter(Boolean)
      .join(', ');
    if (locationInfo) contextParts.push(`located in ${locationInfo}`);

    const context = contextParts.length > 0 ? ` - ${contextParts.join(', ')}` : '';

    // Create page-specific prompt
    const pagePrompts: Record<string, string> = {
      about: `Generate compelling hero section content for the About page of a restaurant website.

Restaurant Details:
- Name: ${restaurant.name}${context}

Requirements:
- Write a headline (1-3 words only) that includes "About Us" or similar about-related phrase (e.g., "Our Story", "About Us", "Our Journey")
- Write a subheadline (1-3 words only) that provides context or emotion (e.g., "Passion & Quality", "Family Tradition", "Culinary Excellence")
- Write a description (2 sentences, max 120 characters) that tells the restaurant's story and values
- Use professional but warm tone
- Make it authentic and inviting
- Focus on the restaurant's unique story, values, and what makes them special
- Create the description based on the restaurant type, cuisine, and location provided above

Generate the content in JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
      contact: `Generate compelling hero section content for the Contact page of a restaurant website.

Restaurant Details:
- Name: ${restaurant.name}${context}

Requirements:
- Write a headline (1-3 words only) that includes "Contact" or similar contact-related phrase (e.g., "Get In Touch", "Contact Us", "Reach Out", "Connect")
- Write a subheadline (1-3 words only) that provides context or emotion (e.g., "We're Here", "Let's Talk", "Always Available", "Visit Us")
- Write a description (2 sentences, max 120 characters) that invites questions, reservations, or feedback
- Use friendly and welcoming tone
- Make it inviting and approachable
- Focus on accessibility and making guests feel welcome to reach out

Generate the content in JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
      menu: `Generate compelling hero section content for the Menu page of a restaurant website.

Restaurant Details:
- Name: ${restaurant.name}${context}

Requirements:
- Write a headline (1-3 words only) that includes "Menu" or similar menu-related phrase (e.g., "Our Menu", "Explore Menu", "What We Serve", "Discover")
- Write a subheadline (1-3 words only) that emphasizes quality or variety (e.g., "Fresh Daily", "Crafted Perfectly", "Flavors Await", "Pure Quality")
- Write a description (2 sentences, max 120 characters) that invites guests to explore the menu
- Use appetizing and inviting tone
- Focus on food quality and variety
- Create excitement about the culinary offerings

Generate the content in JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
    };

    const prompt = pagePrompts[pageName] || pagePrompts['about'];

    // Prepare the request for Claude 3 Haiku
    const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    // Invoke the model
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
      throw new Error('Invalid response from Bedrock model');
    }

    const generatedText = responseBody.content[0].text.trim();

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Bedrock response');
    }

    const generatedContent = JSON.parse(jsonMatch[0]);

    console.log(`✅ Generated AI content for ${pageName} page hero`);

    return {
      headline: generatedContent.headline || `Welcome to ${restaurant.name}`,
      subheadline: generatedContent.subheadline || '',
      description: generatedContent.description || '',
    };

  } catch (error) {
    console.error('Error generating hero content with Bedrock:', error);
    return null;
  }
}

async function createNavbarFromTheme(restaurantId: string, themeId: string) {
  // Fetch the theme to get its sections
  const themeData = await adminGraphqlRequest<GetThemeResponse>(GET_THEME_BY_ID, {
    theme_id: themeId,
  });

  if (!themeData.themes_by_pk || !themeData.themes_by_pk.sections) {
    console.log('No theme sections found for navbar');
    return;
  }

  const theme = themeData.themes_by_pk;
  let sections: ThemeSection[] = [];

  // Handle sections as either array or object
  if (Array.isArray(theme.sections)) {
    sections = theme.sections;
  } else if (typeof theme.sections === 'object') {
    sections = Object.values(theme.sections);
  }

  // Find navbar section
  const navbarSection = sections.find(section => section.type === 'navbar');

  if (!navbarSection) {
    console.log('No navbar section found in theme');
    return;
  }

  // Fetch restaurant's global_styles
  const restaurantQuery = `
    query GetRestaurantGlobalStyles($restaurant_id: uuid!) {
      restaurants_by_pk(restaurant_id: $restaurant_id) {
        global_styles
      }
    }
  `;

  const restaurantData = await adminGraphqlRequest<{ restaurants_by_pk: { global_styles: any } | null }>(
    restaurantQuery,
    { restaurant_id: restaurantId }
  );

  const globalStyles = restaurantData.restaurants_by_pk?.global_styles || {};

  // Fetch pages with show_on_navbar to populate menu_items
  const pagesQuery = `
    query GetNavbarPages($restaurant_id: uuid!) {
      web_pages(
        where: {
          restaurant_id: {_eq: $restaurant_id},
          show_on_navbar: {_eq: true},
          published: {_eq: true},
          is_deleted: {_eq: false}
        },
        order_by: {created_at: asc}
      ) {
        page_id
        name
        url_slug
      }
    }
  `;

  const pagesData = await adminGraphqlRequest<{ web_pages: Array<{ page_id: string; name: string; url_slug: string }> }>(
    pagesQuery,
    { restaurant_id: restaurantId }
  );

  // Transform pages to menu items
  const menuItems = (pagesData.web_pages || []).map((page: any) => ({
    label: page.name,
    href: `/${page.url_slug}`,
  }));

  // Build config based on global styles with navbar section overrides
  // Priority: globalStyles > navbarSection.style > defaults
  const config = {
    bgColor: (globalStyles as any)?.primaryColor || navbarSection.style?.bgColor || '#4a90e2',
    textColor: (globalStyles as any)?.navbarTextColor || globalStyles?.title?.color || navbarSection.style?.textColor || '#2c3e50',
    buttonBgColor: (globalStyles as any)?.accentColor || globalStyles?.primaryButton?.backgroundColor || navbarSection.style?.buttonBgColor || '#000000',
    buttonTextColor: globalStyles?.primaryButton?.color || navbarSection.style?.buttonTextColor || '#ffffff',
    buttonBorderRadius: globalStyles?.primaryButton?.borderRadius || navbarSection.style?.buttonBorderRadius || '0.5rem',
    position: navbarSection.style?.position || 'fixed',
    logoSize: navbarSection.style?.logoSize || 40,
    fontFamily: globalStyles?.title?.fontFamily || navbarSection.style?.fontFamily || 'Poppins, sans-serif',
    fontSize: navbarSection.style?.fontSize || '0.875rem',
    fontWeight: navbarSection.style?.fontWeight || 500,
    textTransform: navbarSection.style?.textTransform || 'uppercase',
    ctaButton: {
      label: 'Order Online',
      href: '/menu',
      style: 'primary'
    },
    showCtaButton: navbarSection.style?.showCtaButton !== undefined ? navbarSection.style.showCtaButton : true
  };

  // Create navbar template (without page_id - it's global)
  // Use navbarSection.id as the name (contains layout ID like "bordered-centered")
  await adminGraphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
    restaurant_id: restaurantId,
    name: navbarSection.id || navbarSection.name || 'default',
    category: 'Navbar',
    config: config,
    menu_items: menuItems,
    page_id: null,
    order_index: 0,
    ref_template_id: null,
  });

  console.log('✅ Navbar template created from theme with global styles');
}

async function createFooterFromTheme(restaurantId: string, themeId: string) {
  // Fetch the theme to get its sections
  const themeData = await adminGraphqlRequest<GetThemeResponse>(GET_THEME_BY_ID, {
    theme_id: themeId,
  });

  if (!themeData.themes_by_pk || !themeData.themes_by_pk.sections) {
    console.log('No theme sections found for footer');
    return;
  }

  const theme = themeData.themes_by_pk;
  let sections: ThemeSection[] = [];

  // Handle sections as either array or object
  if (Array.isArray(theme.sections)) {
    sections = theme.sections;
  } else if (typeof theme.sections === 'object') {
    sections = Object.values(theme.sections);
  }

  // Find footer section
  const footerSection = sections.find(section => section.type === 'footer');

  if (!footerSection) {
    console.log('No footer section found in theme');
    return;
  }

  // Fetch restaurant's global_styles and details for AI content generation
  const restaurantQuery = `
    query GetRestaurantDetails($restaurant_id: uuid!) {
      restaurants_by_pk(restaurant_id: $restaurant_id) {
        name
        global_styles
        address
        city
        state
        country
        postal_code
      }
    }
  `;

  const restaurantData = await adminGraphqlRequest<{
    restaurants_by_pk: {
      name: string;
      global_styles: any;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postal_code?: string;
    } | null
  }>(
    restaurantQuery,
    { restaurant_id: restaurantId }
  );

  const globalStyles = restaurantData.restaurants_by_pk?.global_styles || {};
  const restaurantDetails = restaurantData.restaurants_by_pk;

  // Generate AI-powered aboutContent
  let generatedAboutContent = '';

  if (restaurantDetails) {
    try {
      // Build location string from address components
      const locationParts = [];
      if (restaurantDetails.city) locationParts.push(restaurantDetails.city);
      if (restaurantDetails.state) locationParts.push(restaurantDetails.state);
      if (restaurantDetails.country) locationParts.push(restaurantDetails.country);
      const location = locationParts.join(', ');

      // Call the generate-footer-content API
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/generate-footer-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurantDetails.name || 'Restaurant',
          location: location,
          address: restaurantDetails.address,
          city: restaurantDetails.city,
          state: restaurantDetails.state,
          country: restaurantDetails.country,
          tone: 'professional',
          maxLength: 200,
        }),
      });

      const contentData = await response.json();

      if (contentData.success && contentData.content) {
        generatedAboutContent = contentData.content;
        console.log('✅ AI-generated footer content created');
      } else {
        console.warn('Failed to generate AI content:', contentData.error);
      }
    } catch (error) {
      console.error('Error generating AI content for footer:', error);
      // Continue without AI-generated content
    }
  }

  // Build config based on global styles with footer section overrides
  // Priority: AI-generated content > globalStyles > footerSection.style > defaults
  const config = {
    bgColor: (globalStyles as any)?.primaryColor || footerSection.style?.bgColor || '#4a90e2',
    textColor: globalStyles?.paragraph?.color || footerSection.style?.textColor || '#ffffff',
    linkColor: (globalStyles as any)?.textColor || footerSection.style?.linkColor || '#ffffff',
    copyrightBgColor: (globalStyles as any)?.accentColor || footerSection.style?.copyrightBgColor || '#ffca58',
    copyrightTextColor: footerSection.style?.copyrightTextColor || '#ffffff',
    fontFamily: globalStyles?.paragraph?.fontFamily || footerSection.style?.fontFamily || 'Poppins, sans-serif',
    fontSize: globalStyles?.paragraph?.fontSize || footerSection.style?.fontSize || '0.9375rem',
    fontWeight: globalStyles?.paragraph?.fontWeight || footerSection.style?.fontWeight || 400,
    textTransform: footerSection.style?.textTransform || 'none',
    headingFontFamily: globalStyles?.subheading?.fontFamily || footerSection.style?.headingFontFamily || 'Poppins, sans-serif',
    headingFontSize: globalStyles?.subheading?.fontSize || footerSection.style?.headingFontSize || '1.125rem',
    headingFontWeight: globalStyles?.subheading?.fontWeight || footerSection.style?.headingFontWeight || 600,
    headingTextTransform: footerSection.style?.headingTextTransform || 'uppercase',
    copyrightFontFamily: globalStyles?.paragraph?.fontFamily || footerSection.style?.copyrightFontFamily || 'Poppins, sans-serif',
    copyrightFontSize: footerSection.style?.copyrightFontSize || '0.875rem',
    copyrightFontWeight: footerSection.style?.copyrightFontWeight || 400,
    aboutContent: generatedAboutContent || footerSection.style?.aboutContent || '',
    showNewsletter: footerSection.style?.showNewsletter !== undefined ? footerSection.style.showNewsletter : true,
    showSocialMedia: footerSection.style?.showSocialMedia !== undefined ? footerSection.style.showSocialMedia : true,
  };

  // Create footer template (without page_id - it's global)
  // Use footerSection.id as the name (contains layout ID like "centered", "three-column", etc.)
  await adminGraphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
    restaurant_id: restaurantId,
    name: footerSection.id || footerSection.name || 'default',
    category: 'Footer',
    config: config,
    menu_items: {},
    page_id: null,
    order_index: 0,
    ref_template_id: null,
  });

  console.log('✅ Footer template created from theme with global styles');
}

async function createThemeSections(restaurantId: string, themeId: string, pageId: string) {
  // Fetch the theme to get its sections
  const themeData = await adminGraphqlRequest<GetThemeResponse>(GET_THEME_BY_ID, {
    theme_id: themeId,
  });

  if (!themeData.themes_by_pk || !themeData.themes_by_pk.sections) {
    console.log('No theme sections found, skipping section creation');
    return;
  }

  const theme = themeData.themes_by_pk;
  let sections: ThemeSection[] = [];

  // Handle sections as either array or object
  if (Array.isArray(theme.sections)) {
    sections = theme.sections;
  } else if (typeof theme.sections === 'object') {
    sections = Object.values(theme.sections);
  }

  if (sections.length === 0) {
    console.log('No sections to create');
    return;
  }

  // List of supported section categories
  const SUPPORTED_CATEGORIES = [
    'hero',
    'menu',
    'customcode',
    'scrollingtext',
    'timeline',
    'faq',
    'gallery',
    'youtube',
    'location',
    'reviews',
    'form',
    'customsection'
  ];

  // Filter sections: exclude navbar/footer and only include supported categories
  const pageSections = sections.filter(
    section => {
      const isNavbarOrFooter = section.type === 'navbar' || section.type === 'footer';
      const isSupported = SUPPORTED_CATEGORIES.includes(section.type.toLowerCase());
      return !isNavbarOrFooter && isSupported;
    }
  );

  if (pageSections.length === 0) {
    console.log('No supported page sections to create');
    return;
  }

  // Sort sections by order_index or order
  pageSections.sort((a, b) => {
    const orderA = a.order_index ?? a.order ?? 0;
    const orderB = b.order_index ?? b.order ?? 0;
    return orderA - orderB;
  });

  // Create a template entry for each section
  for (const section of pageSections) {
    const orderIndex = section.order_index ?? section.order ?? 0;

    await adminGraphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: section.name || section.type,
      category: section.type,
      config: section.style || {},
      menu_items: {},
      page_id: pageId,
      order_index: orderIndex,
      ref_template_id: null,
    });
  }

  console.log(`✅ Created ${pageSections.length} page section(s) from theme`);
}

/**
 * Creates sections for other pages (like About, Contact, etc.) from theme's other_page_sections
 * @param restaurantId - Restaurant ID
 * @param themeId - Theme ID to fetch other_page_sections from
 */
async function createOtherPageSectionsFromTheme(
  restaurantId: string,
  themeId: string
) {
  // Fetch the theme to get other_page_sections
  const themeData = await adminGraphqlRequest<GetThemeResponse>(GET_THEME_BY_ID, {
    theme_id: themeId,
  });

  if (!themeData.themes_by_pk || !themeData.themes_by_pk.other_page_sections) {
    console.log('No other_page_sections found in theme');
    return;
  }

  const otherPageSections = themeData.themes_by_pk.other_page_sections;

  if (!Array.isArray(otherPageSections) || otherPageSections.length === 0) {
    console.log('other_page_sections is empty or not an array');
    return;
  }

  // Fetch restaurant's global_styles once for all sections
  const restaurantQuery = `
    query GetRestaurantGlobalStyles($restaurant_id: uuid!) {
      restaurants_by_pk(restaurant_id: $restaurant_id) {
        global_styles
      }
    }
  `;

  const restaurantData = await adminGraphqlRequest<{ restaurants_by_pk: { global_styles: any } | null }>(
    restaurantQuery,
    { restaurant_id: restaurantId }
  );

  const globalStyles = restaurantData.restaurants_by_pk?.global_styles || {};

  // Process each page configuration in other_page_sections
  // Format: [{ "about": [...sections] }, { "contact": [...sections] }]
  for (const pageConfig of otherPageSections) {
    for (const [pageName, sections] of Object.entries(pageConfig)) {
      if (!Array.isArray(sections) || sections.length === 0) {
        continue;
      }

      // Get page ID by slug (e.g., "about" -> about page ID)
      const pageId = await getPageIdBySlug(restaurantId, pageName);

      if (!pageId) {
        console.log(`Page "${pageName}" not found, skipping sections`);
        continue;
      }

      console.log(`Creating ${sections.length} section(s) for "${pageName}" page`);

      // Sort sections by order_index
      const sortedSections = [...sections].sort((a, b) => {
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      });

      // Create a template entry for each section
      for (const section of sortedSections) {
        // Map section type to category
        let category = section.type;

        // Normalize category names to match expected format
        const isHeroSection = category.toLowerCase() === 'hero';
        const isCustomSection = category.toLowerCase() === 'customsection';

        if (isHeroSection) {
          category = 'Hero';
        } else if (isCustomSection) {
          category = 'CustomSection';
        }

        // Use full config if provided, otherwise create minimal config with layout ID
        let sectionConfig = section.config || { layout: section.id };

        // For Hero sections without full config, generate AI content and merge with global styles
        if (isHeroSection && !section.config) {
          console.log(`  ⚡ Generating AI content for ${pageName} page hero (layout: ${section.id})...`);
          const aiContent = await generateHeroContent(restaurantId, pageName, section.id);

          // Default fallback content if AI generation fails (page-specific)
          const defaultContentByPage: Record<string, { headline: string; subheadline: string; description: string }> = {
            about: {
              headline: 'Our Story',
              subheadline: 'Passion & Quality',
              description: 'We craft memorable dining experiences. Fresh ingredients meet culinary excellence.',
            },
            contact: {
              headline: 'Get In Touch',
              subheadline: "We're Here",
              description: 'Have questions or reservations? Contact us anytime. We love hearing from you!',
            },
            menu: {
              headline: 'Our Menu',
              subheadline: 'Fresh Daily',
              description: 'Explore our carefully crafted dishes. Every plate tells a delicious story.',
            },
          };

          const defaultContent = defaultContentByPage[pageName] || {
            headline: 'Welcome',
            subheadline: 'Discover More',
            description: 'Exceptional experiences await. Join us for something special.',
          };

          // Use AI content if available, otherwise use defaults
          const content = aiContent || defaultContent;

          // Build config using global_styles for CSS/styling and AI/default content for dynamic text
          sectionConfig = {
            layout: section.id, // Layout from theme

            // Dynamic content from AI or defaults
            headline: content.headline,
            subheadline: content.subheadline,
            description: content.description,

            // CSS/Styling from global_styles
            bgColor: globalStyles?.backgroundColor || '#ffffff',
            mobileBgColor: '',
            textColor: globalStyles?.textColor || '#000000',
            textAlign: 'center',
            mobileTextAlign: 'center',

            // Spacing
            paddingTop: '6rem',
            paddingBottom: '6rem',
            paddingInline: '',
            mobilePaddingInline: '',
            minHeight: '600px',

            // Typography from global_styles
            titleFontFamily: globalStyles?.title?.fontFamily || 'Inter, system-ui, sans-serif',
            titleFontSize: globalStyles?.title?.fontSize || '2.25rem',
            titleMobileFontSize: '',
            titleFontWeight: globalStyles?.title?.fontWeight || 700,
            titleColor: globalStyles?.title?.color || '#111827',

            subtitleFontFamily: globalStyles?.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
            subtitleFontSize: globalStyles?.subheading?.fontSize || '1.5rem',
            subtitleMobileFontSize: '',
            subtitleFontWeight: globalStyles?.subheading?.fontWeight || 600,
            subtitleColor: globalStyles?.subheading?.color || '#374151',

            bodyFontFamily: globalStyles?.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
            bodyFontSize: globalStyles?.paragraph?.fontSize || '1rem',
            bodyMobileFontSize: '',
            bodyFontWeight: globalStyles?.paragraph?.fontWeight || 400,
            bodyColor: globalStyles?.paragraph?.color || '#6b7280',

            // Content panel
            contentMaxWidth: '1200px',
            contentAnimation: 'none',

            // Buttons (disabled by default for about/contact pages, but include config for easy enabling)
            primaryButton: {
              label: 'View Menu',
              href: '#menu',
              variant: 'primary',
            },
            secondaryButton: {
              label: 'Book a Table',
              href: '#reservations',
              variant: 'outline',
            },
            primaryButtonEnabled: false,
            secondaryButtonEnabled: false,

            // Other defaults
            showScrollIndicator: false,
            imageBorderRadius: '',
            imageObjectFit: 'cover',
            is_custom: false,
            buttonStyleVariant: 'primary',

            // Content panels
            defaultContentPanelEnabled: false,
            defaultContentPanelBackgroundColor: '#ffffff',
            defaultContentPanelMobileBackgroundColor: '',
            defaultContentPanelBorderRadius: '2rem',
            defaultContentPanelMobileBorderRadius: '',
            defaultContentPanelMaxWidth: '960px',

            videoContentPanelEnabled: false,
            videoContentPanelBackgroundColor: 'rgba(15, 23, 42, 0.48)',
            videoContentPanelMobileBackgroundColor: '',
            videoContentPanelBorderRadius: '2rem',
            videoContentPanelMobileBorderRadius: '',
            videoContentPanelMaxWidth: '640px',
            videoContentPanelMinHeight: '',
            videoContentPanelMarginTop: '',
            videoContentPanelMarginBottom: '',
            videoContentPanelMobileMaxWidth: '',
            videoContentPanelMobileMinHeight: '',
            videoContentPanelMobileMarginTop: '',
            videoContentPanelMobileMarginBottom: '',
            videoContentPanelPosition: 'left',
          };
        }

        // For Custom sections without full config, generate AI content and merge with global styles
        if (isCustomSection && !section.config) {
          console.log(`  ⚡ Generating AI content for ${pageName} page custom section (name: ${section.name || section.id})...`);
          const aiContent = await generateCustomSectionContent(restaurantId, pageName, section.name || section.id);

          // Default fallback content for custom sections
          const defaultCustomContent = {
            headline: section.name || 'Our Values',
            subheadline: 'What Sets Us Apart',
            description: 'We are committed to excellence in everything we do. Quality and service are our priorities.',
          };

          // Use AI content if available, otherwise use defaults
          const content = aiContent || defaultCustomContent;

          // Fetch media image for the custom section
          const mediaImage = await getRestaurantMedia(restaurantId);

          // Build config using global_styles for CSS/styling and AI/default content for dynamic text
          // Note: Fonts and typography will be applied from global_styles at render time
          sectionConfig = {
            layout: section.id, // Layout from theme

            // Dynamic content from AI or defaults
            headline: content.headline,
            subheadline: content.subheadline,
            description: content.description,

            // Image from media table (or placeholder if no image found)
            image: mediaImage || {
              url: '',
              alt: 'Section image',
            },

            // CSS/Styling from global_styles (simple structure)
            bgColor: globalStyles?.backgroundColor || '#ffffff',
            textColor: globalStyles?.textColor || '#000000',
            textAlign: 'center',

            // Spacing
            paddingTop: '4rem',
            paddingBottom: '4rem',
            minHeight: '400px',

            // Content settings
            contentMaxWidth: '1200px',
          };
        }

        // Ensure restaurant_id is set in config if not already present
        if (!sectionConfig.restaurant_id) {
          sectionConfig = { ...sectionConfig, restaurant_id: restaurantId };
        }

        // Ensure layout is set in config if not already present (for backwards compatibility)
        if (!sectionConfig.layout && section.id) {
          sectionConfig = { ...sectionConfig, layout: section.id };
        }

        await adminGraphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
          restaurant_id: restaurantId,
          name: section.name || section.id || section.type,
          category: category,
          config: sectionConfig, // Use full config or minimal config with layout and AI content
          menu_items: {},
          page_id: pageId, // Correctly pass the page ID for the specific page
          order_index: section.order_index ?? 0,
          ref_template_id: null,
        });

        console.log(`  ✓ Created ${category} section "${section.name || section.id}" (layout: ${sectionConfig.layout}) for page_id: ${pageId}`);
      }

      console.log(`✅ Created ${sortedSections.length} section(s) for "${pageName}" page`);
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const restaurantId = params.restaurantId;
    const body = await request.json();
    const { restaurantName, templateId } = body;

    if (!restaurantId || !restaurantName) {
      return NextResponse.json(
        { error: 'Restaurant ID and name are required' },
        { status: 400 }
      );
    }

    // Generate staging domain (Vercel subdomain)
    const defaultStagingDomain = buildDefaultStagingDomain(restaurantName);

    // Add domain to Vercel project via API
    const vercelResult = await addVercelDomain(defaultStagingDomain);

    if (!vercelResult.success) {
      console.error('Failed to add domain to Vercel:', vercelResult.error);
      return NextResponse.json(
        {
          error: `Failed to create staging domain: ${vercelResult.error}`,
          details: 'Make sure VERCEL_API_TOKEN and VERCEL_PROJECT_ID are configured correctly.'
        },
        { status: 500 }
      );
    }

    // Update restaurant with staging domain
    await updateRestaurantData(restaurantId, defaultStagingDomain);

    // Create default system pages
    await ensureDefaultSystemPagesForRestaurant(restaurantId, restaurantName);

    // Create theme sections if templateId is provided
    if (templateId) {
      // Create navbar and footer from theme (global templates)
      await createNavbarFromTheme(restaurantId, templateId);
      await createFooterFromTheme(restaurantId, templateId);

      // Create page sections for home page
      const homePageId = await getHomePageId(restaurantId);

      if (homePageId) {
        await createThemeSections(restaurantId, templateId, homePageId);
      } else {
        console.warn('Home page not found, skipping theme sections creation');
      }

      // Create sections for other pages (about, contact, etc.) from theme's other_page_sections
      await createOtherPageSectionsFromTheme(restaurantId, templateId);
    }

    return NextResponse.json({
      success: true,
      stagingDomain: defaultStagingDomain,
      pagesCreated: DEFAULT_SYSTEM_PAGES.length,
      vercelDomainAdded: true,
      vercelNeedsVerification: vercelResult.needsVerification || false,
    });
  } catch (error) {
    console.error('Error initializing website:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initialize website',
      },
      { status: 500 }
    );
  }
}
