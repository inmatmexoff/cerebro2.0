import { NextRequest, NextResponse } from 'next/server';
import { ML_CALLBACK_PATH, ML_API_PROXY_URL } from '@/lib/ml-config';

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
    const response = await fetch(ML_API_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching Mercado Libre token from proxy:', data);
      const errorMessage = data.message || 'Authentication failed';
      return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(errorMessage)}`);
    }

    // Here you would typically save the access_token, refresh_token, etc., to a secure place like a database or session.
    console.log('Mercado Libre Tokens Received from proxy:', data);

    // Redirect to a success page or the dashboard.
    const redirectUrl = `${origin}/?ml_connected=true`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Internal server error during Mercado Libre auth via proxy:', error);
    if (error instanceof Error) {
        return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(error.message)}`);
    }
    return NextResponse.redirect(`${origin}/mercadolibre?error=Internal-server-error`);
  }
}
