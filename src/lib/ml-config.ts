// Credentials provided by user:
// App ID: 915941616480976

// It is strongly recommended to move this to an environment variable for production.
// e.g., NEXT_PUBLIC_ML_APP_ID
export const ML_APP_ID = process.env.NEXT_PUBLIC_ML_APP_ID || '915941616480976';


// NOTE: The ML_CLIENT_SECRET and ML_REDIRECT_URI are NOT used directly in this Next.js app.
// The redirect URI is constructed dynamically in the client and handled by a dedicated API route.
// The secret should be securely stored as an environment variable on the external token exchange service.
