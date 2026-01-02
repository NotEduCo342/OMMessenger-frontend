import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api-om.wexun.tech';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/${path}`;
  
  console.log(`[Proxy] ${method} ${url}`);

  // Get cookies from the request
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  // Forward headers
  const headers: HeadersInit = {
    'Content-Type': request.headers.get('content-type') || 'application/json',
  };

  // Add cookies if present
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  // Add CSRF token if present
  const csrfToken = cookieStore.get('om_csrf')?.value;
  if (csrfToken && method !== 'GET' && method !== 'HEAD') {
    headers['X-OM-CSRF'] = csrfToken;
  }

  // Get request body for POST/PUT
  let body: string | undefined;
  if (method === 'POST' || method === 'PUT') {
    try {
      const text = await request.text();
      if (text) body = text;
    } catch (e) {
      // No body
    }
  }

  try {
    // Make request to backend
    const response = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include',
    });

    // Extract Set-Cookie headers from backend response
    const setCookieHeaders = response.headers.getSetCookie?.() || [];

    // Create response with backend data
    const data = await response.text();
    const nextResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });

    // Forward Set-Cookie headers to browser
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}
