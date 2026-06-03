import type { Handle } from '@sveltejs/kit';

// Os [[headers]] do netlify.toml só cobrem assets estáticos; o documento HTML é
// servido pela função SSR (adapter-netlify). Estes headers cobrem essa resposta —
// em especial frame-ancestors/X-Frame-Options (anti-clickjacking) precisam vir aqui.
const CSP =
	"default-src 'self'; " +
	"script-src 'self' 'unsafe-inline'; " +
	"style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data:; " +
	"font-src 'self' data:; " +
	"connect-src 'self' https://mptkexwsojbtdfcsbzqv.supabase.co wss://mptkexwsojbtdfcsbzqv.supabase.co; " +
	"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('Content-Security-Policy', CSP);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	return response;
};
