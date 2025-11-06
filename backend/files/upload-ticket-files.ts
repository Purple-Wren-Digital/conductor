// import { api, APIError } from "encore.dev/api";
// import { getUserContext } from "../auth/user-context";
// import { prisma } from "../ticket/db";
// import { ticketFilesBucket } from "../buckets";

// export interface SaveFileRequest {
//   fileName: string;
//   fileData: string; // base64-encoded file from client
//   uploaderId: string;
//   uploaderName?: string;
//   ticketId: string;
//   // url?: string;
// }

// export interface SaveFileResponse {
//   success: boolean;
// }

// export const uploadTicketFile = api<SaveFileRequest, SaveFileResponse>(
//   { expose: true, method: "POST", path: "/files", auth: false },
//   async (req) => {
//     // const userContext = await getUserContext();
//     const buffer = Buffer.from(req.fileData, "base64");
//     const key = `${req.ticketId}-${Date.now()}-${req.fileName}`;

//     // Upload to AWS
//     await ticketFilesBucket.upload(key, buffer, {
//       contentType: "application/pdf",
//     });

//     const url = ticketFilesBucket.publicUrl(key); // Generate a public or signed URL

//     // Save to DB
//     const file = await prisma.file.create({
//       data: {
//         filename: req.fileName,
//         url: url,
//         uploaderId: req.uploaderId,
//         uploaderName: req?.uploaderName ? req.uploaderName : null,
//         ticketId: req.ticketId,
//       },
//     });

//     return { success: true } as SaveFileResponse;
//   }
// );
