import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { addVercelDomain } from '@/lib/server/vercel-domains';

const DEFAULT_STAGING_DOMAIN_SUFFIX = '.vercel.app';

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

interface Theme {
  theme_id: string;
  sections: ThemeSection[] | Record<string, ThemeSection>;
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
  const query = `
    query GetHomePage($restaurant_id: uuid!) {
      web_pages(where: { restaurant_id: { _eq: $restaurant_id }, url_slug: { _eq: "home" }, is_deleted: { _eq: false } }) {
        page_id
      }
    }
  `;

  const data = await adminGraphqlRequest<{ web_pages: Array<{ page_id: string }> }>(query, {
    restaurant_id: restaurantId,
  });

  return data.web_pages.length > 0 ? data.web_pages[0].page_id : null;
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

      // Create page sections
      const homePageId = await getHomePageId(restaurantId);

      if (homePageId) {
        await createThemeSections(restaurantId, templateId, homePageId);
      } else {
        console.warn('Home page not found, skipping theme sections creation');
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
