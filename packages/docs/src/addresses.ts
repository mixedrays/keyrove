import { createAddresses } from '../build/addresses.ts';

/**
 * The site's addresses as the browser has them: under the deploy base, on
 * whichever origin served the page. Only the build knows the site URL, and
 * nothing in the browser needs an absolute one.
 */
export const addresses = createAddresses({ base: import.meta.env.BASE_URL });
