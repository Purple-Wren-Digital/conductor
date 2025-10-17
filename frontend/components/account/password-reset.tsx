// "use client";

// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { useStore } from "@/app/store-provider";

// export default function PasswordReset({
//   isCurrentUserProfile,
//   fetchManagementToken,
// }: {
//   isCurrentUserProfile: boolean;
//   fetchManagementToken: () => Promise<any>;
// }) {
//   const { currentUser } = useStore();

//   const generatePasswordResetLink = async (auth0Id: string) => {
//     if (!isCurrentUserProfile) {
//       throw new Error("Not authorized to update this profile");
//     }
//     try {
//       const token = await fetchManagementToken();
//       if (!token) throw new Error("No token available");
//       const response = await fetch("/api/admin/passwordReset", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ auth0Id: auth0Id }),
//       });

//       if (!response.ok) {
//         throw new Error(
//           response?.statusText
//             ? response.statusText
//             : "Failed to generate password reset link"
//         );
//       }
//       const data = await response.json();
//       console.log("Password Reset Data", data);
//       if (!data || !data?.ticket) {
//         throw new Error("No password reset link returned from Auth0");
//       }

//       return data.ticket;
//     } catch (error) {
//       console.error("Error generating password reset link:", error);
//       return null;
//     }
//   };

//   const handleResetRequest = async () => {
//     if (!isCurrentUserProfile || !currentUser?.auth0Id) {
//       alert("Error: No user information available. Cannot reset password.");
//       return;
//     }
//     const resetLink = await generatePasswordResetLink(currentUser.auth0Id);
//     if (resetLink) {
//       alert("Please check your email for the password reset link.");
//       // window.open(resetLink, "_blank");
//     } else {
//       alert("Error: Failed to generate password reset link.");
//     }
//   };

//   return (
//     <Card className="max-w-5xl w-full mx-auto">
//       <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4 ">
//         <div className="flex flex-col gap-2">
//           <CardTitle className="text-lg">Reset Password</CardTitle>
//           <CardDescription>
//             Send a password reset email to your registered email address. This
//             link will expire after 5 days.
//           </CardDescription>
//         </div>
//         <Button
//           className="w-full sm:w-fit"
//           disabled={!isCurrentUserProfile || !currentUser?.auth0Id}
//           onClick={handleResetRequest}
//         >
//           Send Reset Email
//         </Button>
//       </CardHeader>
//     </Card>
//   );
// }
