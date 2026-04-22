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

// DB keepalive — prevents the Encore Rust proxy's connections to RDS from going
// stale due to AWS NAT Gateway idle TCP timeout (~350s).
// Runs every 4 minutes (well under the 350s threshold).
let consecutiveHeartbeatFailures = 0;

const dbHeartbeat = setInterval(async () => {
  const start = Date.now();
  try {
    await db.queryRow`SELECT 1 as heartbeat`;
    const ms = Date.now() - start;
    consecutiveHeartbeatFailures = 0;
    if (ms > 1000) {
      log.warn("[db-heartbeat] slow", { durationMs: ms });
    }
  } catch (err) {
    consecutiveHeartbeatFailures++;
    log.error("[db-heartbeat] failed", {
      error: err instanceof Error ? err.message : String(err),
      consecutiveFailures: consecutiveHeartbeatFailures,
    });
  }
}, 4 * 60 * 1000); // 4 minutes
dbHeartbeat.unref();

// This runs when the service starts
async function initialize() {
  console.log("Initializing Conductor backend...");

  try {
    // Test database connection with a simple query
    await db.queryRow`SELECT 1 as test`;
    console.log("Database connected");

    // Check if database has data
    const userCountResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM users
    `;
    const userCount = userCountResult?.count ?? 0;

    const ticketCountResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int as count FROM tickets
    `;
    const ticketCount = ticketCountResult?.count ?? 0;

    log.info("Database status", { userCount, ticketCount });
    log.info("DB heartbeat active — interval 4m");

    console.log("Initialization complete");
  } catch (error) {
    console.error("Initialization failed:", error);
    // Don't crash the app, just log the error
  }
}

// Run initialization on startup
initialize().catch(console.error);