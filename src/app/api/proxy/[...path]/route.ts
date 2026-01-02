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

  console.log(`[Proxy] Cookies from request:`, cookieHeader || 'none');

  // Forward headers
  const headers: HeadersInit = {
    'Content-Type': request.headers.get('content-type') || 'application/json',
    'Origin': 'https://om.wexun.tech',
  };

  // Add cookies if present
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  // Add CSRF token if present
  const csrfToken = cookieStore.get('om_csrf')?.value;
  if (csrfToken && method !== 'GET' && method !== 'HEAD') {
    headers['X-OM-CSRF'] = csrfToken;
    console.log(`[Proxy] Adding CSRF token: ${csrfToken.substring(0, 10)}...`);
  }

  console.log(`[Proxy] Request headers:`, JSON.stringify(headers, null, 2));

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

    console.log(`[Proxy] Response status: ${response.status}`);

    // Extract Set-Cookie headers from backend response
    // Try multiple methods to get Set-Cookie headers
    let setCookieHeaders: string[] = [];
    
    if (typeof response.headers.getSetCookie === 'function') {
      setCookieHeaders = response.headers.getSetCookie();
    } else {
      // Fallback: manually extract from raw headers
      const rawSetCookie = response.headers.get('set-cookie');
      if (rawSetCookie) {
        setCookieHeaders = [rawSetCookie];
      }
    }

    console.log(`[Proxy] Set-Cookie headers found: ${setCookieHeaders.length}`);
    setCookieHeaders.forEach((cookie, idx) => {
      const cookieName = cookie.split('=')[0];
      console.log(`[Proxy] Cookie ${idx + 1}: ${cookieName}`);
    });

    // Create response with backend data
    const data = await response.text();
    
    // Log response body if error
    if (response.status >= 400) {
      console.log(`[Proxy] Error response body:`, data.substring(0, 200));
    }
    
    const nextResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });

    // Forward Set-Cookie headers to browser
    // Rewrite domain to ensure cookies work with frontend origin
    setCookieHeaders.forEach((cookie) => {
      // Remove domain attribute if present (let browser use current origin)
      // Remove any backend-specific domain
      let rewrittenCookie = cookie
        .replace(/;\s*Domain=[^;]+/gi, '')
        .replace(/;\s*domain=[^;]+/gi, '');
      
      // Ensure Path is set to / if not present
      if (!/Path=/i.test(rewrittenCookie)) {
        rewrittenCookie += '; Path=/';
      }
      
      console.log(`[Proxy] Rewritten cookie: ${rewrittenCookie.substring(0, 100)}...`);
      nextResponse.headers.append('Set-Cookie', rewrittenCookie);
    });

    console.log(`[Proxy] Response headers set, forwarding ${setCookieHeaders.length} cookies`);

    return nextResponse;
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}
