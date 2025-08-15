#!/usr/bin/env node

/**
 * Local Development Auth Helper
 * 
 * This utility helps you test your backend APIs with the "local" auth token
 * for easier local development.
 * 
 * Usage examples:
 * 
 * 1. Test any endpoint with local token:
 *    curl -H "Authorization: Bearer local" http://localhost:4000/endpoint
 * 
 * 2. Set NODE_ENV=development (required for local token to work):
 *    NODE_ENV=development encore run
 */

const generateCurlExample = (endpoint = "dashboard/metrics") => {
  return `curl -H "Authorization: Bearer local" http://localhost:4000/${endpoint}`;
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const endpoint = args[0] || "dashboard/metrics";
  
  console.log("🔧 Local Development Auth Helper");
  console.log("================================");
  console.log("");
  console.log("📝 Curl command for endpoint '" + endpoint + "':");
  console.log(generateCurlExample(endpoint));
  console.log("");
  console.log("💡 Make sure to run your backend with NODE_ENV=development");
  console.log("   Example: NODE_ENV=development encore run");
}

module.exports = {
  generateCurlExample
};