import { NextRequest, NextResponse } from 'next/server';
import { ML_CALLBACK_PATH, ML_API_PROXY_URL } from '@/lib/ml-config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const origin = request.nextUrl.origin;

  // The redirect URI for the proxy to use is the one registered with ML,
  // which is this Next.js app's own callback URL.
  const redirectUriForProxy = `${origin}${ML_CALLBACK_PATH}`;

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
        redirect_uri: redirectUriForProxy,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching Mercado Libre token from proxy:', data);
      const errorMessage = data.message || 'Authentication failed';
      return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(errorMessage)}`);
    }

    // Pass the successful token data to the frontend for display.
    // In a real app, you would handle this more securely (e.g., sessions).
    console.log('Mercado Libre Tokens Received from proxy:', data);
    const successData = JSON.stringify({ message: '¡Tokens recibidos exitosamente!', tokens: data });
    return NextResponse.redirect(`${origin}/mercadolibre?data=${encodeURIComponent(successData)}`);

  } catch (error) {
    console.error('Internal server error during Mercado Libre auth via proxy:', error);
    if (error instanceof Error) {
        return NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(error.message)}`);
    }
    return NextResponse.redirect(`${origin}/mercadolibre?error=Internal-server-error`);
  }
}
