import { createAddresses } from '../build/addresses.ts';

// Only the build knows the site URL; the browser needs no absolute one.
export const addresses = createAddresses({ base: import.meta.env.BASE_URL });
