import { NextRequest, NextResponse } from 'next/server';
import { ML_APP_ID, ML_CLIENT_SECRET, ML_CALLBACK_PATH } from '@/lib/ml-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const origin = request.nextUrl.origin;

  // Dynamically construct the redirect URI using the request's origin.
  const redirectUri = `${origin}${ML_CALLBACK_PATH}`;

  if (!code) {
    const errorDescription = searchParams.get('error_description') || 'No code provided by Mercado Libre.';
    return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(errorDescription)}`);
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
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching Mercado Libre token:', data);
      const errorMessage = data.message || 'Authentication failed';
      return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(errorMessage)}`);
    }

    // Here you would typically save the access_token, refresh_token, etc., to a secure place like a database or session.
    console.log('Mercado Libre Tokens Received:', data);

    // Redirect to a success page or the dashboard.
    const redirectUrl = `${origin}/?ml_connected=true`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Internal server error during Mercado Libre auth:', error);
    if (error instanceof Error) {
        return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(error.message)}`);
    }
    return NextResponse.redirect(`${origin}/mercadolibre?error=Internal-server-error`);
  }
}
