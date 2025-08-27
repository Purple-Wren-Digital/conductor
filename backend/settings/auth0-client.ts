import { ManagementClient } from 'auth0';

// Auth0 Management API configuration
const auth0Management = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN || 'dev-dq7x3qvzastuk3p2.us.auth0.com',
  clientId: process.env.AUTH0_M2M_CLIENT_ID!,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!
});

export default auth0Management;