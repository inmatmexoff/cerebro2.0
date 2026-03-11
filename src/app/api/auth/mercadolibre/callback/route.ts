import { NextResponse } from 'next/server';

// This is the user's backend service that handles the secure token exchange
const TOKEN_EXCHANGE_SERVICE_URL = 'https://api-ml-2-p2yw.onrender.com/callback';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // The final destination for the user in the frontend
  const frontendRedirectUrl = new URL('/mercadolibre', origin);

  if (error) {
    frontendRedirectUrl.searchParams.set('error', `Error de autorización de Mercado Libre: ${error}`);
    return NextResponse.redirect(frontendRedirectUrl);
  }

  if (!code) {
    frontendRedirectUrl.searchParams.set('error', 'No se recibió el código de autorización.');
    return NextResponse.redirect(frontendRedirectUrl);
  }

  try {
    // Our Next.js backend will call the user's Render service backend.
    const tokenServiceUrl = new URL(TOKEN_EXCHANGE_SERVICE_URL);
    tokenServiceUrl.searchParams.set('code', code);
    
    // The token service needs to know the redirect_uri that was used to get the code,
    // which is this API route's URL.
    const thisApiRouteUrl = request.url.split('?')[0];
    tokenServiceUrl.searchParams.set('redirect_uri', thisApiRouteUrl);
    
    const response = await fetch(tokenServiceUrl.toString());

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error del servicio de token (${response.status}): ${errorBody}`);
    }

    const tokenData = await response.json();

    // The client expects a `data` parameter containing a stringified JSON with a `tokens` key.
    // We pass the entire JSON response from the service under the `tokens` key.
    frontendRedirectUrl.searchParams.set('data', JSON.stringify({ tokens: tokenData }));
    return NextResponse.redirect(frontendRedirectUrl);

  } catch (e: any) {
    console.error(`Error en el intercambio de token: ${e.message}`);
    frontendRedirectUrl.searchParams.set('error', `Hubo un problema al conectar con el servicio de autenticación.`);
    return NextResponse.redirect(frontendRedirectUrl);
  }
}

// Ensure Vercel doesn't cache this dynamic route
export const dynamic = 'force-dynamic';
