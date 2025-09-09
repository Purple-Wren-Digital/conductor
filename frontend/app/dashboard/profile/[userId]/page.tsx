// import * as React from "react";
// import UserProfileLayout from "@/components/profile/user-profile-layout";
// import { useUserRole } from "@/lib/hooks/use-user-role";

// export default function UserProfilePage({
//   params,
// }: {
//   params: { userId: string };
// }) {
//   const { role, isLoading } = useUserRole();

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-96">
//         <div className="text-center">
//           <p className="text-muted-foreground">Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }
//   switch (role) {
//     case "ADMIN":
//       return <UserProfileLayout />; // TODO:
//     case "STAFF":
//       return <UserProfileLayout />; // TODO:
//     case "AGENT":
//       return <UserProfileLayout />;
//     default:
//       return (
//         <div className="text-center py-8">
//           <p className="text-muted-foreground">
//             Unable to determine your role. Please contact support.
//           </p>
//         </div>
//       );
//   }
// }
