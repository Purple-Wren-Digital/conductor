import { db } from "../ticket/db";
import log from "encore.dev/log";

// Log unhandled rejections so we can see what's killing the process
process.on("unhandledRejection", (reason, promise) => {
  log.error("UNHANDLED PROMISE REJECTION - process will crash", {
    reason: reason instanceof Error ? reason.stack || reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  log.error("UNCAUGHT EXCEPTION - process will crash", {
    error: error.stack || error.message,
  });
});

// This runs when the service starts
async function initialize() {
  console.log("🚀 Initializing Conductor backend...");

  try {
    // Test database connection with a simple query
    await db.queryRow`SELECT 1 as test`;
    console.log("✅ Database connected");

    // Check if database has data
    const userCountResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM users
    `;
    const userCount = userCountResult?.count ?? 0;

    const ticketCountResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM tickets
    `;
    const ticketCount = ticketCountResult?.count ?? 0;

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