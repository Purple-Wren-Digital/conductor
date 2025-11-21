import { prisma } from "../ticket/db";

// This runs when the service starts
async function initialize() {
  console.log("🚀 Initializing Conductor backend...");

  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connected");

    // Check if database has data
    const userCount = await prisma.user.count();
    const ticketCount = await prisma.ticket.count();

    console.log(`📊 Database status: ${userCount} users, ${ticketCount} tickets`);

    if (userCount === 0) {
      console.log("⚠️  No users found. Run /seed endpoint after startup to populate initial data.");
    }

    // Log environment info
    const env = process.env.NODE_ENV || 'development';
    console.log(`🌍 Environment: ${env}`);

    if (env === 'production') {
      console.log("📌 Production Reminders:");
      console.log("   1. Update Resend webhook URL to production endpoint");
      console.log("   2. Verify DNS records are pointing correctly");
      console.log("   3. Check all secrets are configured");
    }

    console.log("✅ Initialization complete");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    // Don't crash the app, just log the error
  }
}

// Run initialization on startup
initialize().catch(console.error);