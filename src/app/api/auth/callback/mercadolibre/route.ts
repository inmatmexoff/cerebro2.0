import { NextRequest, NextResponse } from 'next/server';
import { ML_APP_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI } from '@/lib/ml-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    const errorDescription = searchParams.get('error_description') || 'No code provided by Mercado Libre.';
    return NextResponse.redirect(new URL(`/mercadolibre?error=${encodeURIComponent(errorDescription)}`, request.url));
  }

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_APP_ID,
        client_secret: ML_CLIENT_SECRET,
        code: code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching Mercado Libre token:', data);
      const errorMessage = data.message || 'Authentication failed';
      return NextResponse.redirect(new URL(`/mercadolibre?error=${encodeURIComponent(errorMessage)}`, request.url));
    }

    // Here you would typically save the access_token, refresh_token, etc., to a secure place like a database or session.
    console.log('Mercado Libre Tokens Received:', data);

    // Redirect to a success page or the dashboard.
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('ml_connected', 'true');

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Internal server error during Mercado Libre auth:', error);
    return NextResponse.redirect(new URL('/mercadolibre?error=Internal-server-error', request.url));
  }
}
