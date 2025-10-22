import WebSocket, { WebSocketServer } from "ws";
import { getUserContext } from "../../auth/user-context";

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map<string, WebSocket>(); // userId → ws

wss.on("connection", async (ws: WebSocket, req) => {
  const userContext = await getUserContext();
  if (userContext && userContext?.userId) {
    clients.set(userContext.userId, ws);
  }

  ws.on("close", () => clients.delete(userContext?.userId));
});

export async function broadcastNotification(userId: string, notification: any) {
  console.log(`📡 TODO: Broadcast to ${userId}:`, notification);
  // TODO: Implement WebSocket broadcast
  const client = clients.get(userId);
  if (client && client?.readyState === client.OPEN) {
    client.send(JSON.stringify(notification));
  }
}
