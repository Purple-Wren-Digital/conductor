import WebSocket, { WebSocketServer } from "ws";
import net from "net";

const PORT = 8081;

const globalForWS = globalThis as unknown as {
  _wss?: WebSocketServer;
  _clients?: Map<string, WebSocket>;
};

if (!globalForWS._clients) {
  globalForWS._clients = new Map<string, WebSocket>();
}

const clients = globalForWS._clients;

// Check if port is already in use
function isPortTaken(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(true))
      .once("listening", function () {
        tester.once("close", () => resolve(false)).close();
      })
      .listen(port);
  });
}

async function createWebSocketServer() {
  if (globalForWS._wss) return globalForWS._wss;

  const taken = await isPortTaken(PORT);

  if (taken) {
    console.log(
      `⚠️  WebSocket already running on port ${PORT}, skipping rebind.`
    );
    return globalForWS._wss;
  }

  const wss = new WebSocketServer({ port: PORT });
  globalForWS._wss = wss;
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);

  wss.on("connection", async (ws, req) => {
    try {
      const reqUrl = req.url || "/";
      const base = `http://${req.headers.host}`;
      const url = new URL(reqUrl, base);
      const clerkId = url.searchParams.get("clerkId"); // do with email instead: email
      if (!clerkId) {
        ws.close(1008, "Unauthorized: missing token (user id)");
        return;
      }

      clients.set(clerkId, ws);
      console.log(`👤 Connected: ${clerkId}`);

      ws.on("close", () => {
        clients.delete(clerkId);
        console.log(`❌ Disconnected: ${clerkId}`);
      });
    } catch (err) {
      console.error("WebSocket connection error:", err);
      ws.close(1011, "Server error");
    }
  });

  return wss;
}

// Run immediately in dev
createWebSocketServer();

export async function broadcastNotification(
  clerkId: string,
  notification: any
) {
  const client = clients.get(clerkId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
  } else {
    console.warn(`⚠️  User ${clerkId} not connected. Skipping.`);
  }
}
