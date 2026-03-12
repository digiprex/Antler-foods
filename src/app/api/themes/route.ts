/**
 * Themes API
 *
 * GET /api/themes - Fetch all available themes from database
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface Theme {
  theme_id: string;
  name: string;
  description: string;
  tags: string[] | null;
  sections: any;
  style: any;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface ThemesResponse {
  themes: Theme[];
}

const GET_ALL_THEMES = `
  query GetAllThemes {
    themes(
      where: {
        is_deleted: {_eq: false}
      },
      order_by: {created_at: asc}
    ) {
      theme_id
      name
      description
      tags
      sections
      style
      created_at
      updated_at
      is_deleted
    }
  }
`;

export async function GET() {
  try {
    const data = await adminGraphqlRequest<ThemesResponse>(GET_ALL_THEMES, {});

    if (!data.themes) {
      return NextResponse.json({
        success: false,
        error: 'No themes found',
        data: [],
      });
    }

    return NextResponse.json({
      success: true,
      data: data.themes,
    });
  } catch (error) {
    console.error('Error fetching themes:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    );
  }
}
