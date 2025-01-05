/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const response = await resolve(event);

  // Add Railway-specific headers in production
  if (import.meta.env.PROD) {
    response.headers.set('X-Railway-Service', 'frontend');
    // Allow Railway internal routing
    response.headers.set('Access-Control-Allow-Origin', 'https://backend-production-6e08.up.railway.app');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}
