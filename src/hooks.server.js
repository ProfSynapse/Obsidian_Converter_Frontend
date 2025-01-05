/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const response = await resolve(event);

  // Add Railway-specific headers in production
  if (import.meta.env.PROD) {
    response.headers.set('X-Railway-Service', 'frontend');
    // Allow Railway internal routing
    response.headers.set('Access-Control-Allow-Origin', 'https://frontend-production-2748.internal');
  }

  return response;
}
