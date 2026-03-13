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
  content?: string; // Content context for AI generation (e.g., "about", "dining", "mission")
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

async function checkIfPageHasSections(restaurantId: string, pageId: string): Promise<boolean> {
  const query = `
    query CheckPageSections($restaurant_id: uuid!, $page_id: uuid!) {
      templates(where: {
        restaurant_id: { _eq: $restaurant_id },
        page_id: { _eq: $page_id },
        is_deleted: { _eq: false }
      }) {
        template_id
      }
    }
  `;

  const data = await adminGraphqlRequest<{ templates: Array<{ template_id: string }> }>(query, {
    restaurant_id: restaurantId,
    page_id: pageId,
  });

  return data.templates.length > 0;
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
        postal_code
        phone_number
        email
        poc_email
        poc_phone_number
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
      postal_code?: string;
      phone_number?: string;
      email?: string;
      poc_email?: string;
      poc_phone_number?: string;
    } | null
  }>(query, { restaurant_id: restaurantId });

  return data.restaurants_by_pk;
}

/**
 * Create a contact form for the restaurant
 * @param restaurantId - Restaurant ID
 * @param restaurantName - Restaurant name
 * @returns The created form's ID
 */
async function createContactForm(restaurantId: string, restaurantName: string): Promise<string | null> {
  try {
    // Default contact form fields
    const formFields = [
      {
        id: 'name',
        type: 'text',
        label: 'Full Name',
        placeholder: 'John Doe',
        required: true,
        order: 1,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'john@example.com',
        required: true,
        order: 2,
      },
      {
        id: 'phone',
        type: 'tel',
        label: 'Phone Number',
        placeholder: '+1 (555) 123-4567',
        required: false,
        order: 3,
      },
      {
        id: 'message',
        type: 'textarea',
        label: 'Message',
        placeholder: 'How can we help you?',
        required: true,
        order: 4,
      },
    ];

    // Fetch restaurant POC email instead of generating a default email
    let formEmail = '';
    
    try {
      const restaurantQuery = `
        query GetRestaurantEmails($restaurant_id: uuid!) {
          restaurants_by_pk(restaurant_id: $restaurant_id) {
            poc_email
            email
          }
        }
      `;
      
      const restaurantData = await adminGraphqlRequest<{
        restaurants_by_pk: { poc_email?: string; email?: string } | null
      }>(restaurantQuery, { restaurant_id: restaurantId });

      const restaurant = restaurantData.restaurants_by_pk;
      
      if (restaurant?.poc_email) {
        formEmail = restaurant.poc_email;
        console.log(`✅ Using restaurant POC email for contact form: ${formEmail}`);
      } else if (restaurant?.email) {
        formEmail = restaurant.email;
        console.log(`✅ Using restaurant email for contact form: ${formEmail}`);
      } else {
        // Fallback to generated email if no emails exist
        const cleanName = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '');
        formEmail = `contact@${cleanName}.com`;
        console.log(`⚠️ No POC email or restaurant email found, using generated email: ${formEmail}`);
      }
    } catch (error) {
      console.error('Error fetching restaurant POC email:', error);
      // Fallback to generated email
      const cleanName = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '');
      formEmail = `contact@${cleanName}.com`;
      console.log(`⚠️ Error fetching POC email, using generated email: ${formEmail}`);
    }

    const mutation = `
      mutation CreateForm(
        $title: String!
        $email: String!
        $fields: jsonb!
        $restaurant_id: uuid!
      ) {
        insert_forms_one(object: {
          title: $title
          email: $email
          fields: $fields
          restaurant_id: $restaurant_id
        }) {
          form_id
        }
      }
    `;

    const data = await adminGraphqlRequest<{
      insert_forms_one: { form_id: string } | null;
    }>(mutation, {
      title: 'Contact Form',
      email: formEmail,
      fields: formFields,
      restaurant_id: restaurantId,
    });

    if (data.insert_forms_one?.form_id) {
      console.log(`✅ Created contact form with ID: ${data.insert_forms_one.form_id}`);
      return data.insert_forms_one.form_id;
    }

    return null;
  } catch (error) {
    console.error('Error creating contact form:', error);
    return null;
  }
}

/**
 * Get content guidance based on content theme and page name
 * @param contentTheme - Content theme (e.g., 'about', 'dining', 'mission')
 * @param pageName - Page name (e.g., 'home', 'about', 'contact')
 */
function getContentGuidance(contentTheme: string, pageName: string) {
  const contentMap: Record<string, { headlineHint?: string; specificInstructions: string }> = {
    about: {
      headlineHint: '(e.g., "Our Story", "About Us", "Our Journey")',
      specificInstructions: 'Focus on the restaurant\'s history, founding story, or what makes them unique. Emphasize authenticity and personal connection.'
    },
    dining: {
      headlineHint: '(e.g., "Fine Dining", "Dining Experience", "Our Atmosphere")',
      specificInstructions: 'Highlight the dining experience, atmosphere, service quality, and what guests can expect when they visit. Focus on ambiance and hospitality.'
    },
    mission: {
      headlineHint: '(e.g., "Our Mission", "Our Purpose", "Why We Exist")',
      specificInstructions: 'Articulate the restaurant\'s core mission, values, and commitment to guests. Focus on their purpose and what drives them.'
    },
    values: {
      headlineHint: '(e.g., "Core Values", "What We Believe", "Our Principles")',
      specificInstructions: 'Describe the fundamental values and principles that guide the restaurant. Focus on integrity, quality, and service standards.'
    },
    team: {
      headlineHint: '(e.g., "Our Team", "Meet The Crew", "The People")',
      specificInstructions: 'Highlight the people behind the restaurant - chefs, staff, and their expertise. Focus on passion and dedication.'
    },
    quality: {
      headlineHint: '(e.g., "Quality First", "Fresh Ingredients", "Excellence")',
      specificInstructions: 'Emphasize commitment to quality ingredients, preparation methods, and standards. Focus on freshness and craftsmanship.'
    },
    experience: {
      headlineHint: '(e.g., "The Experience", "Memorable Moments", "Your Visit")',
      specificInstructions: 'Describe the overall guest experience from arrival to departure. Focus on creating lasting memories.'
    }
  };

  // Default guidance for unknown content themes
  const defaultGuidance = {
    specificInstructions: 'Create content that reflects the restaurant\'s commitment to excellence and guest satisfaction. Make it relevant and engaging.'
  };

  return contentMap[contentTheme.toLowerCase()] || defaultGuidance;
}

/**
 * Generate custom section content using Amazon Bedrock AI
 * @param restaurantId - Restaurant ID
 * @param pageName - Page name (e.g., 'about', 'contact')
 * @param sectionName - Section name (e.g., 'Mission', 'Values', 'Team')
 * @param contentContext - Content context from theme (e.g., 'about', 'dining', 'mission')
 */
async function generateCustomSectionContent(
  restaurantId: string,
  pageName: string,
  sectionName: string,
  contentContext?: string
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

    // Determine the content theme based on contentContext or sectionName
    const contentTheme = contentContext || sectionName;
    
    // Create content-specific guidance
    const contentGuidance = getContentGuidance(contentTheme, pageName);

    // Create prompt for custom section
    const prompt = `Generate compelling custom section content for the "${sectionName}" section on the ${pageName} page of a restaurant website.

Restaurant Details:
- Name: ${restaurant.name}${context}

Content Theme: ${contentTheme}
${contentGuidance}

Requirements:
- Write a headline (1-2 words only) that captures "${contentTheme}" ${contentGuidance.headlineHint ? contentGuidance.headlineHint : ''}
- Write a subheadline (2-4 words) that provides context
- Write a description (1 sentence, max 60 characters) about the "${contentTheme}" theme
- Keep it concise and distinct from hero sections
- Avoid repetitive restaurant language
- ${contentGuidance.specificInstructions ? contentGuidance.specificInstructions : 'Make it relevant to the restaurant industry'}

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
      home: `Generate concise SEO-optimized hero content for the Home page.

Restaurant: ${restaurant.name}${context}

Requirements:
- Headline (2-4 words max): Include restaurant name (e.g., "Welcome to ${restaurant.name}", "${restaurant.name} Restaurant")
- Subheadline (3-5 words max): Cuisine/location (e.g., "${restaurant.cuisine_types?.[0] || 'Fine'} Dining Experience")
- Description (1 sentence, max 60 characters): Unique and inviting
- Keep distinct from other sections
- Avoid generic phrases

JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
      about: `Generate concise hero content for the About page.

Restaurant: ${restaurant.name}${context}

Requirements:
- Headline (1-2 words): (e.g., "Our Story", "About Us")
- Subheadline (2-3 words): (e.g., "Since [Year]", "Family Tradition")
- Description (1 sentence, max 40 characters): About heritage/story
- Keep brief and distinct

JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
      contact: `Generate concise hero content for the Contact page.

Restaurant: ${restaurant.name}${context}

Requirements:
- Headline (1-2 words): (e.g., "Contact Us", "Get In Touch")
- Subheadline (2-3 words): (e.g., "We're Here", "Always Available")
- Description (1 sentence, max 30 characters): About accessibility
- Keep minimal and action-focused

JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
      menu: `Generate concise hero content for the Menu page.

Restaurant: ${restaurant.name}${context}

Requirements:
- Headline (1-2 words): (e.g., "Our Menu", "Discover")
- Subheadline (2-3 words): (e.g., "Fresh Daily", "Crafted Perfectly")
- Description (1 sentence, max 30 characters): About food quality
- Keep appetizing but brief

JSON format:
{
  "headline": "...",
  "subheadline": "...",
  "description": "..."
}`,
    };

    const prompt = pagePrompts[pageName] || pagePrompts['home'];

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

  // Fetch restaurant's global_styles for consistent styling (same as other pages)
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
    
    // Use section.style as base config, but enhance it with global styles (same as other pages)
    let sectionConfig = section.style || {};
    
    // For Hero sections, generate AI content and merge with global styles (same as other pages)
    const isHeroSection = section.type.toLowerCase() === 'hero';
    if (isHeroSection) {
      console.log(`  ⚡ Generating AI content for home page hero (layout: ${section.id})...`);
      const aiContent = await generateHeroContent(restaurantId, 'home', section.id);

      // Default fallback content for home page with SEO optimization
      // Fetch restaurant details for SEO-optimized fallback content
      const restaurant = await getRestaurantDetails(restaurantId);
      const locationInfo = restaurant ? [restaurant.city, restaurant.state, restaurant.country].filter(Boolean).join(', ') : '';
      const cuisineType = restaurant?.cuisine_types && Array.isArray(restaurant.cuisine_types) && restaurant.cuisine_types.length > 0
        ? restaurant.cuisine_types[0]
        : '';
      
      const defaultContent = {
        headline: restaurant?.name ? `Welcome to ${restaurant.name}` : 'Welcome',
        subheadline: cuisineType ? `${cuisineType} Dining` : 'Fine Dining',
        description: `Fresh cuisine, warm atmosphere.`,
      };

      // Use AI content if available, otherwise use defaults
      const content = aiContent || defaultContent;

      // Check if layout requires an image and fetch from media table
      const mediaImage = await getRestaurantMedia(restaurantId);

      // Build enhanced config using global_styles for CSS/styling and AI/default content for dynamic text
      sectionConfig = {
        ...sectionConfig, // Keep any existing theme styles
        layout: section.id, // Layout from theme

        // Dynamic content from AI or defaults
        headline: content.headline,
        subheadline: content.subheadline,
        description: content.description,

        // Dynamic image from media table if layout supports it
        ...(mediaImage && { backgroundImage: mediaImage.url }),

        // CSS/Styling from global_styles (same as other pages)
        bgColor: globalStyles?.backgroundColor || sectionConfig.bgColor || '#ffffff',
        mobileBgColor: sectionConfig.mobileBgColor || '',
        textColor: globalStyles?.textColor || sectionConfig.textColor || '#000000',
        textAlign: sectionConfig.textAlign || 'center',
        mobileTextAlign: sectionConfig.mobileTextAlign || 'center',

        // Spacing
        paddingTop: sectionConfig.paddingTop || '6rem',
        paddingBottom: sectionConfig.paddingBottom || '6rem',
        paddingInline: sectionConfig.paddingInline || '',
        mobilePaddingInline: sectionConfig.mobilePaddingInline || '',
        minHeight: sectionConfig.minHeight || '600px',

        // Typography from global_styles (same as other pages)
        titleFontFamily: globalStyles?.title?.fontFamily || sectionConfig.titleFontFamily || 'Inter, system-ui, sans-serif',
        titleFontSize: globalStyles?.title?.fontSize || sectionConfig.titleFontSize || '2.25rem',
        titleMobileFontSize: sectionConfig.titleMobileFontSize || '',
        titleFontWeight: globalStyles?.title?.fontWeight || sectionConfig.titleFontWeight || 700,
        titleColor: globalStyles?.title?.color || sectionConfig.titleColor || '#111827',

        subtitleFontFamily: globalStyles?.subheading?.fontFamily || sectionConfig.subtitleFontFamily || 'Inter, system-ui, sans-serif',
        subtitleFontSize: globalStyles?.subheading?.fontSize || sectionConfig.subtitleFontSize || '1.5rem',
        subtitleMobileFontSize: sectionConfig.subtitleMobileFontSize || '',
        subtitleFontWeight: globalStyles?.subheading?.fontWeight || sectionConfig.subtitleFontWeight || 600,
        subtitleColor: globalStyles?.subheading?.color || sectionConfig.subtitleColor || '#374151',

        bodyFontFamily: globalStyles?.paragraph?.fontFamily || sectionConfig.bodyFontFamily || 'Inter, system-ui, sans-serif',
        bodyFontSize: globalStyles?.paragraph?.fontSize || sectionConfig.bodyFontSize || '1rem',
        bodyMobileFontSize: sectionConfig.bodyMobileFontSize || '',
        bodyFontWeight: globalStyles?.paragraph?.fontWeight || sectionConfig.bodyFontWeight || 400,
        bodyColor: globalStyles?.paragraph?.color || sectionConfig.bodyColor || '#6b7280',

        // Content panel
        contentMaxWidth: sectionConfig.contentMaxWidth || '1200px',
        contentAnimation: sectionConfig.contentAnimation || 'none',

        // Buttons (use existing config or defaults)
        primaryButton: sectionConfig.primaryButton || {
          label: 'View Menu',
          href: '#menu',
          variant: 'primary',
        },
        secondaryButton: sectionConfig.secondaryButton || {
          label: 'Book a Table',
          href: '#reservations',
          variant: 'outline',
        },
        primaryButtonEnabled: sectionConfig.primaryButtonEnabled !== undefined ? sectionConfig.primaryButtonEnabled : true,
        secondaryButtonEnabled: sectionConfig.secondaryButtonEnabled !== undefined ? sectionConfig.secondaryButtonEnabled : false,

        // Other defaults
        showScrollIndicator: sectionConfig.showScrollIndicator !== undefined ? sectionConfig.showScrollIndicator : false,
        imageBorderRadius: sectionConfig.imageBorderRadius || '',
        imageObjectFit: sectionConfig.imageObjectFit || 'cover',
        is_custom: sectionConfig.is_custom !== undefined ? sectionConfig.is_custom : false,
        buttonStyleVariant: sectionConfig.buttonStyleVariant || 'primary',

        // Content panels
        defaultContentPanelEnabled: sectionConfig.defaultContentPanelEnabled !== undefined ? sectionConfig.defaultContentPanelEnabled : false,
        defaultContentPanelBackgroundColor: sectionConfig.defaultContentPanelBackgroundColor || '#ffffff',
        defaultContentPanelMobileBackgroundColor: sectionConfig.defaultContentPanelMobileBackgroundColor || '',
        defaultContentPanelBorderRadius: sectionConfig.defaultContentPanelBorderRadius || '2rem',
        defaultContentPanelMobileBorderRadius: sectionConfig.defaultContentPanelMobileBorderRadius || '',
        defaultContentPanelMaxWidth: sectionConfig.defaultContentPanelMaxWidth || '960px',

        videoContentPanelEnabled: sectionConfig.videoContentPanelEnabled !== undefined ? sectionConfig.videoContentPanelEnabled : false,
        videoContentPanelBackgroundColor: sectionConfig.videoContentPanelBackgroundColor || 'rgba(15, 23, 42, 0.48)',
        videoContentPanelMobileBackgroundColor: sectionConfig.videoContentPanelMobileBackgroundColor || '',
        videoContentPanelBorderRadius: sectionConfig.videoContentPanelBorderRadius || '2rem',
        videoContentPanelMobileBorderRadius: sectionConfig.videoContentPanelMobileBorderRadius || '',
        videoContentPanelMaxWidth: sectionConfig.videoContentPanelMaxWidth || '640px',
        videoContentPanelMinHeight: sectionConfig.videoContentPanelMinHeight || '',
        videoContentPanelMarginTop: sectionConfig.videoContentPanelMarginTop || '',
        videoContentPanelMarginBottom: sectionConfig.videoContentPanelMarginBottom || '',
        videoContentPanelMobileMaxWidth: sectionConfig.videoContentPanelMobileMaxWidth || '',
        videoContentPanelMobileMinHeight: sectionConfig.videoContentPanelMobileMinHeight || '',
        videoContentPanelMobileMarginTop: sectionConfig.videoContentPanelMobileMarginTop || '',
        videoContentPanelMobileMarginBottom: sectionConfig.videoContentPanelMobileMarginBottom || '',
        videoContentPanelPosition: sectionConfig.videoContentPanelPosition || 'left',
      };
    }

    // Ensure restaurant_id is set in config
    if (!sectionConfig.restaurant_id) {
      sectionConfig = { ...sectionConfig, restaurant_id: restaurantId };
    }

    await adminGraphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: section.name || section.type,
      category: section.type,
      config: sectionConfig, // Use enhanced config with global styles
      menu_items: {},
      page_id: pageId,
      order_index: orderIndex,
      ref_template_id: null,
    });

    console.log(`  ✓ Created ${section.type} section "${section.name || section.id}" with global styles for home page`);
  }

  console.log(`✅ Created ${pageSections.length} page section(s) from theme with global styles`);
}

/**
 * Creates sections for all pages (including Home, About, Contact, etc.) from theme's other_page_sections
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

      // Create contact form if this is the contact page
      let contactFormId: string | null = null;
      if (pageName === 'contact') {
        // Fetch restaurant name for creating the form
        const restaurantQuery = `
          query GetRestaurantName($restaurant_id: uuid!) {
            restaurants_by_pk(restaurant_id: $restaurant_id) {
              name
            }
          }
        `;
        const restaurantData = await adminGraphqlRequest<{
          restaurants_by_pk: { name: string } | null
        }>(restaurantQuery, { restaurant_id: restaurantId });

        const restaurantName = restaurantData.restaurants_by_pk?.name || 'Restaurant';
        contactFormId = await createContactForm(restaurantId, restaurantName);

        if (contactFormId) {
          console.log(`  ✓ Created contact form with ID: ${contactFormId}`);
        }
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
        const isFormSection = category.toLowerCase() === 'form';

        if (isHeroSection) {
          category = 'Hero';
        } else if (isCustomSection) {
          category = 'CustomSection';
        } else if (isFormSection) {
          category = 'form';
        }

        // Use full config if provided, otherwise create minimal config with layout ID
        let sectionConfig = section.config || { layout: section.id };

        // For Form sections on contact page, ensure they have the form_id regardless of existing config
        if (isFormSection && pageName === 'contact' && contactFormId) {
          // Build complete form configuration
          const formConfig = {
            // Essential form configuration
            form_id: contactFormId,
            isEnabled: true,
            restaurant_id: restaurantId,
            layout: sectionConfig.layout || section.id || 'centered',
            
            // Content configuration with fallbacks
            title: sectionConfig.title || 'Get In Touch',
            subtitle: sectionConfig.subtitle || 'We\'re here to help',
            description: sectionConfig.description || 'Fill out the form below and we\'ll get back to you as soon as possible.',
            
            // Visual configuration
            backgroundColor: sectionConfig.backgroundColor || '#f8fafc',
            mobileBackgroundColor: sectionConfig.mobileBackgroundColor || '',
            textColor: sectionConfig.textColor || '#0f172a',
            mobileTextColor: sectionConfig.mobileTextColor || '',
            accentColor: sectionConfig.accentColor || globalStyles?.primaryColor || '#7c3aed',
            mobileAccentColor: sectionConfig.mobileAccentColor || '',
            buttonText: sectionConfig.buttonText || 'Send Message',
            showImage: sectionConfig.showImage !== undefined ? sectionConfig.showImage : false,
            imageUrl: sectionConfig.imageUrl || '',
            
            // Typography from global_styles
            titleFontFamily: sectionConfig.titleFontFamily || globalStyles?.title?.fontFamily || 'Inter, system-ui, sans-serif',
            titleFontSize: sectionConfig.titleFontSize || globalStyles?.title?.fontSize || '2.25rem',
            titleMobileFontSize: sectionConfig.titleMobileFontSize || '',
            titleFontWeight: sectionConfig.titleFontWeight || globalStyles?.title?.fontWeight || 700,
            titleColor: sectionConfig.titleColor || globalStyles?.title?.color || '#111827',

            subtitleFontFamily: sectionConfig.subtitleFontFamily || globalStyles?.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
            subtitleFontSize: sectionConfig.subtitleFontSize || globalStyles?.subheading?.fontSize || '1.5rem',
            subtitleMobileFontSize: sectionConfig.subtitleMobileFontSize || '',
            subtitleFontWeight: sectionConfig.subtitleFontWeight || globalStyles?.subheading?.fontWeight || 600,
            subtitleColor: sectionConfig.subtitleColor || globalStyles?.subheading?.color || '#374151',

            bodyFontFamily: sectionConfig.bodyFontFamily || globalStyles?.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
            bodyFontSize: sectionConfig.bodyFontSize || globalStyles?.paragraph?.fontSize || '1rem',
            bodyMobileFontSize: sectionConfig.bodyMobileFontSize || '',
            bodyFontWeight: sectionConfig.bodyFontWeight || globalStyles?.paragraph?.fontWeight || 400,
            bodyColor: sectionConfig.bodyColor || globalStyles?.paragraph?.color || '#6b7280',

            // Section style settings
            is_custom: sectionConfig.is_custom !== undefined ? sectionConfig.is_custom : false,
            buttonStyleVariant: sectionConfig.buttonStyleVariant || 'primary',
            sectionTextAlign: sectionConfig.sectionTextAlign || 'center',
            sectionMaxWidth: sectionConfig.sectionMaxWidth || '1200px',
            sectionPaddingY: sectionConfig.sectionPaddingY || '5rem',
            sectionPaddingX: sectionConfig.sectionPaddingX || '1.5rem',
            surfaceBorderRadius: sectionConfig.surfaceBorderRadius || '1.75rem',
            surfaceShadow: sectionConfig.surfaceShadow || 'soft',
            enableScrollReveal: sectionConfig.enableScrollReveal !== undefined ? sectionConfig.enableScrollReveal : false,
            scrollRevealAnimation: sectionConfig.scrollRevealAnimation || 'fade-up',
          };
          
          // Merge with any additional properties from original config, but prioritize form config
          sectionConfig = { ...sectionConfig, ...formConfig };
          
          console.log(`  ✓ Configured form section with form_id: ${contactFormId} and full config`);
        }

        // For Hero sections without full config, generate AI content and merge with global styles
        if (isHeroSection && !section.config) {
          console.log(`  ⚡ Generating AI content for ${pageName} page hero (layout: ${section.id})...`);
          const aiContent = await generateHeroContent(restaurantId, pageName, section.id);

          // Default fallback content if AI generation fails (page-specific)
          // Fetch restaurant details for SEO-optimized fallback content
          const restaurant = await getRestaurantDetails(restaurantId);
          const locationInfo = restaurant ? [restaurant.city, restaurant.state, restaurant.country].filter(Boolean).join(', ') : '';
          const cuisineType = restaurant?.cuisine_types && Array.isArray(restaurant.cuisine_types) && restaurant.cuisine_types.length > 0
            ? restaurant.cuisine_types[0]
            : '';
          
          const defaultContentByPage: Record<string, { headline: string; subheadline: string; description: string }> = {
            home: {
              headline: restaurant?.name ? `Welcome to ${restaurant.name}` : 'Welcome',
              subheadline: cuisineType ? `${cuisineType} Dining` : 'Fine Dining',
              description: `Fresh cuisine, warm atmosphere.`,
            },
            about: {
              headline: 'Our Story',
              subheadline: 'Since Day One',
              description: 'Crafting memorable experiences.',
            },
            contact: {
              headline: 'Contact Us',
              subheadline: "We're Here",
              description: 'Questions? We love to help.',
            },
            menu: {
              headline: 'Our Menu',
              subheadline: 'Fresh Daily',
              description: 'Crafted with passion.',
            },
          };

          const defaultContent = defaultContentByPage[pageName] || {
            headline: 'Welcome',
            subheadline: 'Discover More',
            description: 'Exceptional experiences await. Join us for something special.',
          };

          // Use AI content if available, otherwise use defaults
          const content = aiContent || defaultContent;

          // Check if layout requires an image and fetch from media table
          const mediaImage = await getRestaurantMedia(restaurantId);

          // Build config using global_styles for CSS/styling and AI/default content for dynamic text
          sectionConfig = {
            layout: section.id, // Layout from theme

            // Dynamic content from AI or defaults
            headline: content.headline,
            subheadline: content.subheadline,
            description: content.description,

            // Dynamic image from media table if layout supports it
            ...(mediaImage && { backgroundImage: mediaImage.url }),

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
          console.log(`  ⚡ Generating AI content for ${pageName} page custom section (name: ${section.name || section.id}, content: ${section.content || 'default'})...`);
          const aiContent = await generateCustomSectionContent(restaurantId, pageName, section.name || section.id, section.content);

          // Default fallback content for custom sections
          const defaultCustomContent = {
            headline: section.name || 'Our Values',
            subheadline: 'What Matters',
            description: 'Excellence in every detail.',
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

      // Add form section to contact page if form was created and no form sections exist in theme
      if (pageName === 'contact' && contactFormId) {
        // Check if there are already form sections in the theme configuration
        const hasFormSection = sortedSections.some(section =>
          section.type.toLowerCase() === 'form'
        );

        if (!hasFormSection) {
          const formSectionConfig = {
            isEnabled: true,
            form_id: contactFormId,
            title: 'Get In Touch',
            subtitle: 'We\'re here to help',
            description: 'Fill out the form below and we\'ll get back to you as soon as possible.',
            layout: 'centered',
            backgroundColor: '#f8fafc',
            mobileBackgroundColor: '',
            textColor: '#0f172a',
            mobileTextColor: '',
            accentColor: globalStyles?.primaryColor || '#7c3aed',
            mobileAccentColor: '',
            buttonText: 'Send Message',
            showImage: false,
            imageUrl: '',

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

            // Section style settings
            is_custom: false,
            buttonStyleVariant: 'primary',
            sectionTextAlign: 'center',
            sectionMaxWidth: '1200px',
            sectionPaddingY: '5rem',
            sectionPaddingX: '1.5rem',
            surfaceBorderRadius: '1.75rem',
            surfaceShadow: 'soft',
            enableScrollReveal: false,
            scrollRevealAnimation: 'fade-up',
          };

          // Calculate the order_index (after all existing sections)
          const maxOrderIndex = Math.max(...sortedSections.map(s => s.order_index ?? 0), 0);

          await adminGraphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
            restaurant_id: restaurantId,
            name: 'Contact Form',
            category: 'form',
            config: formSectionConfig,
            menu_items: {},
            page_id: pageId,
            order_index: maxOrderIndex + 1,
            ref_template_id: null,
          });

          console.log(`  ✓ Created form section with form_id: ${contactFormId} for page_id: ${pageId}`);
        } else {
          console.log(`  ⚠️ Skipping form section creation - form section already exists in theme for ${pageName} page`);
        }
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

      // Create sections for all pages (including home, about, contact, etc.) from theme's other_page_sections
      await createOtherPageSectionsFromTheme(restaurantId, templateId);

      // Fallback: If home page sections weren't created from other_page_sections, use theme.sections for home page
      const homePageId = await getHomePageId(restaurantId);
      if (homePageId) {
        // Check if home page already has sections from other_page_sections
        const hasHomeSections = await checkIfPageHasSections(restaurantId, homePageId);
        if (!hasHomeSections) {
          console.log('No home page sections found in other_page_sections, falling back to theme.sections');
          await createThemeSections(restaurantId, templateId, homePageId);
        }
      }
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
