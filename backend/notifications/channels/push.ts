// import admin from "firebase-admin";
import { PushNotificationPayload } from "../types";
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

export async function sendPushNotification(payload: PushNotificationPayload) {
  // TODO: Implement Firebase Cloud Messaging logic
  //   return admin.messaging().send({
  //     payload.token,
  //     notification: {
  //       title: payload.title,
  //       body: payload.body,
  //     },
  //   });
}
