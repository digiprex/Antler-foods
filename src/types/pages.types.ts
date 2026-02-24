export interface PageItem {
  page_id: string;
  url_slug: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  meta_title?: string;
  meta_description?: string;
  restaurant_id?: string;
  website_id?: string;
  is_system_page: boolean;
  show_on_navbar: boolean;
  show_on_footer: boolean;
  keywords?: Record<string, any> | null;
  og_image?: string;
  published: boolean;
}

export interface CreatePageInput {
  url_slug: string;
  name: string;
  meta_title?: string;
  meta_description?: string;
  restaurant_id?: string;
  website_id?: string;
  is_system_page?: boolean;
  show_on_navbar?: boolean;
  show_on_footer?: boolean;
  keywords?: Record<string, any> | null;
  og_image?: string;
  published?: boolean;
}

export interface UpdatePageInput {
  url_slug?: string;
  name?: string;
  meta_title?: string;
  meta_description?: string;
  restaurant_id?: string;
  website_id?: string;
  is_system_page?: boolean;
  show_on_navbar?: boolean;
  show_on_footer?: boolean;
  keywords?: Record<string, any> | null;
  og_image?: string;
  published?: boolean;
}