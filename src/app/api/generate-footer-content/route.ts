/**
 * Amazon Bedrock Content Generation API for Footer About Section
 *
 * This API route uses Amazon Bedrock to generate compelling about content
 * for restaurant footers based on restaurant information from the database.
 */

import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: 'bedrock-api-key',
    secretAccessKey: process.env.AWS_BEARER_TOKEN_BEDROCK || '',
  },
});

interface GenerateContentRequest {
  restaurantName: string;
  restaurantType?: string; // e.g., "Italian Restaurant", "Fast Food", "Fine Dining"
  location?: string;
  specialties?: string[]; // e.g., ["Pizza", "Pasta", "Seafood"]
  tone?: 'professional' | 'casual' | 'elegant' | 'friendly';
  maxLength?: number; // Maximum character length (default: 200 for 2-liner)
  // Additional restaurant details from database table
  description?: string;
  cuisineTypes?: string[];
  priceRange?: string;
  established?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface GenerateContentResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * POST endpoint to generate footer about content using Amazon Bedrock
 * Enhanced to accept restaurant table details for better content generation
 */
export async function POST(request: Request) {
  try {
    const body: GenerateContentRequest = await request.json();

    // Validate required fields
    if (!body.restaurantName) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant name is required',
      } as GenerateContentResponse, { status: 400 });
    }

    // Validate AWS credentials
    if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
      return NextResponse.json({
        success: false,
        error: 'AWS Bedrock token not configured',
      } as GenerateContentResponse, { status: 500 });
    }

    const {
      restaurantName,
      restaurantType = 'restaurant',
      location = '',
      specialties = [],
      tone = 'professional',
      maxLength = 200,
      description = '',
      cuisineTypes = [],
      priceRange = '',
      established = '',
      address = '',
      city = '',
      state = '',
      country = '',
    } = body;

    // Build context for the AI prompt with restaurant details from database
    const contextParts = [];

    // Add restaurant type
    if (restaurantType) contextParts.push(`a ${restaurantType.toLowerCase()}`);

    // Add location information (use provided location or build from address fields)
    const locationInfo = location || [city, state, country].filter(Boolean).join(', ');
    if (locationInfo) contextParts.push(`located in ${locationInfo}`);

    // Add cuisine types if available
    if (cuisineTypes.length > 0) {
      contextParts.push(`serving ${cuisineTypes.join(' and ')} cuisine`);
    } else if (specialties.length > 0) {
      contextParts.push(`specializing in ${specialties.join(', ')}`);
    }

    // Add price range
    if (priceRange) contextParts.push(`${priceRange} price range`);

    // Add establishment year
    if (established) contextParts.push(`established in ${established}`);

    const context = contextParts.length > 0 ? ` - ${contextParts.join(', ')}` : '';

    // Create the prompt for content generation - optimized for 2-liner
    const prompt = `Generate a compelling and concise 2-line about section for a restaurant footer.

Restaurant Details:
- Name: ${restaurantName}${context}${description ? `\n- Description: ${description}` : ''}
- Tone: ${tone}
- Maximum length: ${maxLength} characters

Requirements:
- Write EXACTLY 2 sentences (2-liner)
- Use ${tone} tone
- Focus on what makes this restaurant special and unique
- Include key selling points (quality, service, experience, atmosphere)
- Keep it concise, engaging, and memorable
- Suitable for a website footer
- Do not include contact information, hours, or call-to-action
- Make it sound authentic and inviting
- Avoid generic phrases

Generate only the about text content (2 sentences), no additional formatting or explanations:`;

    // Prepare the request for Claude 3 Haiku (cost-effective model)
    const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 150,
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

    let generatedContent = responseBody.content[0].text.trim();

    // Ensure content doesn't exceed max length
    if (generatedContent.length > maxLength) {
      // Truncate at the last complete sentence within the limit
      const truncated = generatedContent.substring(0, maxLength);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
      );

      if (lastSentenceEnd > maxLength * 0.7) {
        generatedContent = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        // If no good sentence break, truncate at last space
        const lastSpace = truncated.lastIndexOf(' ');
        generatedContent = lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
      }
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
    } as GenerateContentResponse);

  } catch (error) {
    console.error('Error generating footer content:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content',
    } as GenerateContentResponse, { status: 500 });
  }
}

/**
 * GET endpoint to check if the service is available
 */
export async function GET() {
  const isConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  return NextResponse.json({
    success: true,
    available: isConfigured,
    message: isConfigured
      ? 'Content generation service is available'
      : 'AWS credentials not configured',
  });
}
