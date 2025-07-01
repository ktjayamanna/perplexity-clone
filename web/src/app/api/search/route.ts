import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Types for our API
interface SearchSource {
  id: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

interface SearchResponse {
  answer: string;
  sources: SearchSource[];
}

interface SearchRequest {
  query: string;
  location?: string;
}

// Environment variables validation
const requiredEnvVars = {
  SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

function validateEnvironment() {
  const missing = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Rate limiting (simple in-memory store - in production use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// SerpAPI Search
async function performSerpApiSearch(query: string): Promise<SearchSource[]> {
  const apiKey = requiredEnvVars.SERPAPI_API_KEY;

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=8`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    if (!data.organic_results || !Array.isArray(data.organic_results)) {
      return [];
    }

    return data.organic_results.map((item: any, index: number) => ({
      id: `serp-${index + 1}`,
      title: item.title || 'No title',
      url: item.link || '',
      description: item.snippet || 'No description available',
      favicon: item.favicon || `https://www.google.com/s2/favicons?domain=${new URL(item.link || '').hostname}&sz=32`,
    })).filter(item => item.url); // Filter out items without URLs
  } catch (error) {
    console.error('SerpAPI error:', error);
    throw new Error('Failed to perform web search');
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI API for answer generation
async function generateAnswer(query: string, sources: SearchSource[]): Promise<string> {
  const sourceContext = sources
    .map((source, index) => `[${index + 1}] ${source.title}: ${source.description}`)
    .join('\n\n');

  const prompt = `Based on the following search results, provide a comprehensive and accurate answer to the question: "${query}"

Search Results:
${sourceContext}

Please provide a well-structured, informative answer that synthesizes information from the search results. Be factual and cite relevant information naturally. If the search results don't contain enough information to answer the question completely, acknowledge this limitation.

Answer:`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides accurate, well-researched answers based on search results. Always be factual and acknowledge when information is limited.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate answer at this time.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate answer');
  }
}

// Input validation and sanitization
function validateSearchRequest(body: any): SearchRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { query, location } = body;

  if (!query || typeof query !== 'string') {
    throw new Error('Query is required and must be a string');
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    throw new Error('Query cannot be empty');
  }

  if (trimmedQuery.length > 500) {
    throw new Error('Query is too long (max 500 characters)');
  }

  // Basic sanitization - remove potentially harmful characters
  const sanitizedQuery = trimmedQuery.replace(/[<>\"'&]/g, '');

  if (sanitizedQuery.length === 0) {
    throw new Error('Query contains only invalid characters');
  }

  const result: SearchRequest = { query: sanitizedQuery };

  // Optional location parameter
  if (location && typeof location === 'string') {
    const trimmedLocation = location.trim();
    if (trimmedLocation.length > 0 && trimmedLocation.length <= 100) {
      result.location = trimmedLocation.replace(/[<>\"'&]/g, '');
    }
  }

  return result;
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    validateEnvironment();
    
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
      return addSecurityHeaders(rateLimitResponse);
    }
    
    // Parse and validate request
    const body = await request.json();
    const { query, location } = validateSearchRequest(body);

    // Perform search
    const sources = await performSerpApiSearch(query);
    
    // Generate answer
    const answer = await generateAnswer(query, sources);
    
    // Return response with security headers
    const response: SearchResponse = {
      answer,
      sources,
    };

    const nextResponse = NextResponse.json(response);
    return addSecurityHeaders(nextResponse);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Missing required environment variables')) {
        const configErrorResponse = NextResponse.json(
          { error: 'Service configuration error' },
          { status: 500 }
        );
        return addSecurityHeaders(configErrorResponse);
      }

      if (error.message.includes('Query') || error.message.includes('Invalid request')) {
        const validationErrorResponse = NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
        return addSecurityHeaders(validationErrorResponse);
      }
    }
    
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

// Handle unsupported methods
export async function GET() {
  const errorResponse = NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
  return addSecurityHeaders(errorResponse);
}
