// import admin from "firebase-admin";
import { PushNotificationPayload } from "../types";
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

export async function sendPushNotification(payload: PushNotificationPayload) {
  // payload.token
  console.log(
    `📲 Would send push notification to user #${payload.userId}:`,
    payload.title,
    payload.body
  );
  // TODO: Implement Firebase Cloud Messaging logic
  //   return admin.messaging().send({
  //     payload.token,
  //     notification: {
  //       title: payload.title,
  //       body: payload.body,
  //     },
  //   });
}
