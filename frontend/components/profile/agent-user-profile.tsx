// "use client";

// import React, { useCallback, useEffect, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // import { TicketListItem } from "@/components/ui/list-item/ticket-list-item";
// import { Hash, Mail, Shield, SquarePen } from "lucide-react";
// import { UserRole, Ticket } from "@/lib/types";
// import { getAccessToken } from "@auth0/nextjs-auth0";
// import { useUserRole } from "@/lib/hooks/use-user-role";
// import { useStore } from "@/app/store-provider";

// type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

// const AgentUserProfile = () => {
//   const { currentUser } = useStore();

//   return (
//     <div className="space-y-6 ">
//       <Card className="p-4 ">
//         <CardHeader>
//           <div className="flex gap-2 flex-row justify-between items-center">
//             <div className="flex flex-col gap-1">
//               <CardTitle className="text-xl text-foreground pt-4 ">
//                 {currentUser?.name || "User not found"}
//               </CardTitle>

//               <div className="flex gap-2 flex-row items-center">
//                 <p className="text-m text-muted-foreground semi-bold">
//                   {currentUser?.isActive ? "Active" : "Inactive"} User
//                 </p>
//               </div>
//             </div>
//             <Button onClick={() => console.log("pressed")} className="gap-2">
//               <SquarePen className="h-4 w-4" />
//               Edit Profile
//             </Button>
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="flex gap-2 flex-col pb-4">
//             <p className="text-l font-bold">Information</p>
//             <div className="flex gap-2 flex-row items-center">
//               <Hash className="h-4 w-4" />
//               <p className="text-sm"> {currentUser?.id || ""}</p>
//             </div>
//             <div className="flex gap-2 flex-row items-center">
//               <Shield className="h-4 w-4" />
//               <p className="text-sm">{currentUser?.role || ""}</p>
//             </div>
//             <div className="flex gap-2 flex-row items-center">
//               <Mail className="h-4 w-4" />
//               <p className="text-sm">{currentUser?.email || ""}</p>
//             </div>
//           </div>
//           <div className="flex gap-2 flex-row mt-4 mb-4">
//             <p className="text-xs text-muted-foreground">
//               {currentUser?.createdAt
//                 ? `Created on ${new Date(
//                     currentUser.createdAt
//                   ).toLocaleDateString()}`
//                 : ""}
//             </p>
//             <p className="text-xs text-muted-foreground">|</p>
//             <p className="text-xs text-muted-foreground">
//               {currentUser?.updatedAt
//                 ? `Updated on ${new Date(
//                     currentUser.updatedAt
//                   ).toLocaleDateString()} at ${new Date(
//                     currentUser.updatedAt
//                   ).toLocaleTimeString()}`
//                 : ""}
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default AgentUserProfile;
