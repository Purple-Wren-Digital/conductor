// "use client";

// import { useState } from "react";
// import { useStore } from "@/app/store-provider";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
// import { Switch } from "@/components/ui/switch";
// import { Clock, Palette, Globe, AlertTriangle } from "lucide-react";
// import { useQueryClient } from "@tanstack/react-query";
// import { useUserRole } from "@/hooks/use-user-role";
// import { toast } from "sonner";

// export default function Notifications() {
//   const queryClient = useQueryClient();

//   const { currentUser } = useStore();
//   const { role, permissions } = useUserRole();

//   return (
//     <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6">
//       {/* NOTIFICATIONS */}
//       <div className="lg:col-span-2">
//         <Card className="flex flex-col gap-2">
//           <CardHeader>
//             <CardTitle className="text-lg">Notification Settings</CardTitle>
//             <CardDescription>
//               Choose what you want to hear about and how you want to hear about
//               it
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             {/* TYPE OF NOTIFICATIONS */}
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex flex-col">
//                   <p className="font-semibold">Email Notifications</p>
//                   <p className="text-sm text-muted-foreground">
//                     Send all notifications to your email address
//                   </p>
//                 </div>
//                 <Switch id="emailNotifications" defaultChecked />
//               </div>
//               <div className="flex items-center justify-between">
//                 <div className="flex flex-col">
//                   <p className="font-semibold text-muted-foreground">
//                     In-App Notifications
//                   </p>
//                   <p className="text-sm text-muted-foreground">
//                     Show all notifications within the app interface
//                   </p>
//                 </div>
//                 <Switch id="pushNotifications" disabled />
//               </div>
//               <div className="flex items-center justify-between">
//                 <div className="flex flex-col">
//                   <p className="font-semibold text-muted-foreground">
//                     Push Notifications
//                   </p>
//                   <p className="text-sm text-muted-foreground">
//                     Send all notifications to your devices' browser in real-time
//                   </p>
//                 </div>
//                 <Switch id="pushNotifications" disabled />
//               </div>
//             </div>
//             <Separator className="my-4" />
//             {/* APP NOTIFICATIONS */}
//             <div className="space-y-4">
//               <div className="flex flex-col gap-4">
//                 {/* Market Center: Users Added */}
//                 {/* <div className="flex items-center justify-between">
//                   <div className="flex flex-col">
//                     <p className="font-medium">Users Added to Market Center</p>
//                     <p className="text-sm text-muted-foreground">
//                       When team members are assigned to your market center
//                     </p>
//                   </div>
//                   <Switch id="inAppNotifications" />
//                 </div> */}
//                 {/* Ticket: Assignments */}
//                 <div className="flex items-center justify-between">
//                   <div className="flex flex-col">
//                     <p className="font-medium">Ticket Assignments</p>
//                     <p className="text-sm text-muted-foreground">
//                       When a new ticket is assigned to or removed from your
//                       queue
//                     </p>
//                   </div>
//                   <Switch id="smsNotifications" />
//                 </div>
//                 {/* Category: Default Assignment */}
//                 {/* <div className="flex items-center justify-between">
//                   <div className="flex flex-col">
//                     <p className="font-medium">Category Default Assignment</p>
//                     <p className="text-sm text-muted-foreground">
//                       All tickets in that category will automatically be
//                       assigned to you
//                     </p>
//                   </div>
//                   <Switch id="inAppNotifications" />
//                 </div> */}
//                 {/* Ticket: Due Date Reminders */}
//                 <div className="flex items-center justify-between">
//                   <div className="flex flex-col">
//                     <p className="font-medium">Due Date Reminders</p>
//                     <p className="text-sm text-muted-foreground">
//                       When a ticket is approaching its due date
//                     </p>
//                   </div>
//                   <Switch id="smsNotifications" />
//                 </div>
//               </div>
//               {/* MARKET CENTERS */}
//               {/*  <div className="flex flex-col">
//                 <p className="font-semibold mb-4">Market Centers</p>
//                 <div className="flex flex-col gap-4">
//                   <div className="flex items-center justify-between">
//                     <div className="flex flex-col">
//                       <p className="font-medium">Team Members</p>
//                       <p className="text-sm text-muted-foreground">
//                         When team members are assigned to your market center
//                       </p>
//                     </div>
//                     <Switch id="inAppNotifications" />
//                   </div>

//                 </div>
//               </div> */}
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }
