// Credentials provided by user:
// App ID: 915941616480976
// Client Secret: 2QqfRfJo4wmZU3rMSijD2DPkxjLt5N2O

// It is strongly recommended to move these to environment variables for production.
// e.g., NEXT_PUBLIC_ML_APP_ID and ML_CLIENT_SECRET
export const ML_APP_ID = process.env.NEXT_PUBLIC_ML_APP_ID || '915941616480976';
export const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET || '2QqfRfJo4wmZU3rMSijD2DPkxjLt5N2O';

// The path for the redirect URI for the Next.js app's internal API route.
export const ML_CALLBACK_PATH = '/api/auth/callback/mercadolibre';
// The URL for the external proxy service on Render.
export const ML_API_PROXY_URL = 'https://api-ml-2-p2yw.onrender.com';
// The redirect URI that should be configured in the Mercado Libre app dashboard.
// This points to the Render service, which will then redirect back to this application.
export const ML_RENDER_REDIRECT_URI = 'https://api-ml-2-p2yw.onrender.com/api/auth/callback';
