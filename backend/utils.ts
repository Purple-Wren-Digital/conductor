// Local enum definitions (replacing Prisma imports)
export type NotificationCategory = "ACCOUNT" | "ACTIVITY" | "MARKETING" | "PRODUCT" | "PERMISSIONS";
export type NotificationFrequency = "NONE" | "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";

export function mapHistorySnapshot(history: any[]): any[] {
  return history.map((h) => ({
    ...h,
    snapshot: h.snapshot ?? undefined,
  }));
}

export function mapUser(user: any) {
  if (!user) return user;
  return {
    ...user,
    ticketHistory: mapHistorySnapshot(user.ticketHistory),
  };
}

export const defaultNotificationPreferences = [
  // PERMISSIONS
  {
    frequency: "NONE" as NotificationFrequency,
    category: "PERMISSIONS" as NotificationCategory,
    type: "App Permissions",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  // MARKETING
  {
    frequency: "NONE" as NotificationFrequency,
    category: "MARKETING" as NotificationCategory,
    type: "General",
    email: true,
    inApp: true,
    push: true,
    sms: false,
  },
  // PRODUCT
  {
    frequency: "NONE" as NotificationFrequency,
    category: "PRODUCT" as NotificationCategory,
    type: "General",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  //   ACCOUNT
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACCOUNT" as NotificationCategory,
    type: "General",
    email: true,
    inApp: false,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACCOUNT" as NotificationCategory,
    type: "Account Information",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  // ACTIVITY: SUMMARY
  {
    frequency: "DAILY" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Daily Summary",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "WEEKLY" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Weekly Report",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  // ACTIVITY: TICKETS
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Ticket Created",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Ticket Updated",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Ticket Assignment",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  // { // TODO: re-add mentions later
  //   frequency: "INSTANT",
  //   category: "ACTIVITY",
  //   type: "Mentions",
  //   email: true,
  //   inApp: true,
  //   push: false,
  //   sms: false,
  // },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "New Comments",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Market Center Assignment",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Category Assignment",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Ticket Survey",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
  {
    frequency: "INSTANT" as NotificationFrequency,
    category: "ACTIVITY" as NotificationCategory,
    type: "Ticket Survey Results",
    email: true,
    inApp: true,
    push: false,
    sms: false,
  },
];
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Edited Comment",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Deleted Comment",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Ticket Category",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.MONTHLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Tickets: Monthly Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.QUARTERLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Tickets: Quarterly Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.ANNUALLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Tickets: Annual Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// ACTIVITY: TICKET
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Ticket Created",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Ticket Title",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Ticket Description",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Ticket Urgency",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },

// ACTIVITY: MARKET CENTER SUMMARY
// {
//   frequency: NotificationFrequency.DAILY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center: Daily Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.WEEKLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center: Weekly Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.MONTHLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center: Monthly Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.QUARTERLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center: Quarterly Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.ANNUALLY,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center: Annual Summary",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// // ACTIVITY: MARKET CENTER
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Name Change",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Assignment",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },

// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Team Members Added",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Team Members Removed",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center New Category",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Category Default Assignee",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Category Name",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },
// {
//   frequency: NotificationFrequency.INSTANT,
//   category: NotificationCategory.ACTIVITY,
//   type: "Market Center Category Description",
//   email: true,
//   inApp: true,
//   push: true,
//   sms: false,
// },

// export interface GenerateNotifications {
//   userIds: string[];
//   category: NotificationCategory;
//   type: string;
//   title: string;
//   body: string;
//   data?: Record<string, any>;
// }

// export async function generateNotifications({
//   userIds,
//   category,
//   type,
//   title,
//   body,
//   data,
// }: GenerateNotifications) {
//   // ✅ fetch only the relevant, active users who have matching preferences
//   const users = await prisma.user.findMany({
//     where: {
//       AND: [
//         { isActive: true },
//         { id: { in: userIds } },
//         {
//           userSettings: {
//             notificationPreferences: {
//               some: {
//                 category,
//                 type,
//                 frequency: { not: "NONE" },
//               },
//             },
//           },
//         },
//       ],
//     },
//     include: {
//       userSettings: { include: { notificationPreferences: true } },
//     },
//   });

//   const notificationsToCreate: any[] = [];

//   for (const user of users) {
//     const pref = user.userSettings?.notificationPreferences.find(
//       (p) => p.category === category && p.type === type
//     );

//     if (!pref || pref.frequency === "NONE") continue;

//     const now = new Date();

//     if (pref.email)
//       notificationsToCreate.push({
//         userId: user.id,
//         channel: "EMAIL",
//         category,
//         type,
//         title,
//         body,
//         data,
//         read: false,
//         deliveredAt: now,
//         createdAt: now,
//       });

//     if (pref.inApp)
//       notificationsToCreate.push({
//         userId: user.id,
//         channel: "IN_APP",
//         category,
//         type,
//         title,
//         body,
//         data,
//         read: false,
//         deliveredAt: now,
//         createdAt: now,
//       });

//     if (pref.push)
//       notificationsToCreate.push({
//         userId: user.id,
//         channel: "PUSH",
//         category,
//         type,
//         title,
//         body,
//         data,
//         read: false,
//         deliveredAt: now,
//         createdAt: now,
//       });

// if (pref.sms)
//   notificationsToCreate.push({
//     userId: user.id,
//     channel: "SMS",
//     category,
//     type,
//     title,
//     body,
//     data,
//     read: false,
//     deliveredAt: now,
//     createdAt: now,
//   });
//   }

//   if (notificationsToCreate.length > 0)
//     await prisma.notification.createMany({ data: notificationsToCreate });
// }
// Notification Orchestrators

// // CREATE USER
// export async function handleUserCreationNotification({
//   newUser,
//   userContext,
//   marketCenterAssignment,
// }: {
//   newUser: any;
//   userContext: any;
//   marketCenterAssignment?: any;
// }) {
//   const notificationsToSend = [];

//   notificationsToSend.push({
//     userIds: [newUser.id],
//     category: NotificationCategory.ACCOUNT,
//     type: "Onboarding",
//     title: "Welcome to Conductor Ticketing",
//     body: "An account has been created for you in Conductor.",
//     data: {
//       createdBy: userContext.userId,
//       marketCenterId: marketCenterAssignment?.id,
//     },
//   });

//   notificationsToSend.push({
//     userIds: [userContext.userId],
//     category: NotificationCategory.ACTIVITY,
//     type: "Onboarding",
//     title: "New User Created",
//     body: `An account has been created for ${newUser.name} in Conductor`,
//     data: {
//       userId: newUser.id,
//       marketCenterId: marketCenterAssignment?.id,
//     },
//   });

//   if (
//     marketCenterAssignment?.users &&
//     marketCenterAssignment?.users?.length > 0
//   ) {
//     const teamIds = marketCenterAssignment.users
//       .map((u: any) => u.id)
//       .filter((id: string) => id !== newUser.id);
//     if (teamIds && teamIds.length > 0) {
//       notificationsToSend.push({
//         userIds: teamIds,
//         category: NotificationCategory.ACTIVITY,
//         type: "Market Center Team Members Added",
//         title: "Team Member Added",
//         body: `${newUser.name} has joined your market center`,
//         data: {
//           userId: newUser.id,
//           marketCenterId: marketCenterAssignment.id,
//         },
//       });
//     }
//   }

//   // 4️⃣ Send them dynamically (only to users whose notification preferences match)
//   for (const notification of notificationsToSend) {
//     await generateNotifications(notification);
//   }
// }
