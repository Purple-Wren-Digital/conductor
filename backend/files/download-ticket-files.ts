// import { api, APIError } from "encore.dev/api";
// import { getUserContext } from "../auth/user-context";
// import { prisma } from "../ticket/db";
// import { TicketFile } from "./types";

// export interface DownloadFileRequest {
//   fileId: string;
//   ticketId?: string;
// }

// export interface DownloadFileResponse {
//   file: TicketFile;
// }

// export const downloadTicketFile = api<
//   DownloadFileRequest,
//   DownloadFileResponse
// >(
//   { expose: true, method: "POST", path: "/files/:fileId", auth: false },
//   async (req) => {
//     // const userContext = await getUserContext();

//     if (!req.fileId) {
//       throw APIError.invalidArgument("File ID is required");
//     }

//     // Save to DB
//     const file = await prisma.file.findUnique({
//       where: {
//         id: req.fileId,
//       },
//     });

//     if (!file) {
//       throw APIError.notFound("File not found");
//     }

//     return { file: file } as DownloadFileResponse;
//   }
// );
