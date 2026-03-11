// Credentials provided by user:
// App ID: 915941616480976

// It is strongly recommended to move this to an environment variable for production.
// e.g., NEXT_PUBLIC_ML_APP_ID
export const ML_APP_ID = process.env.NEXT_PUBLIC_ML_APP_ID || '915941616480976';

// The full callback URL for the external Render service.
// This is the URL Mercado Libre will redirect to after user authorization.
export const ML_REDIRECT_URI = 'https://api-ml-2-p2yw.onrender.com/callback';

// NOTE: The ML_CLIENT_SECRET is NOT used in this Next.js app. 
// It should be securely stored as an environment variable on the Render service.
