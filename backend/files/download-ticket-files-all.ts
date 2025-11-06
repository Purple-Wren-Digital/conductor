// import { api, APIError } from "encore.dev/api";
// import { getUserContext } from "../auth/user-context";
// import { prisma } from "../ticket/db";
// import { ticketFilesBucket } from "../buckets";
// import { TicketFile } from "./types";

// export interface DownloadAllRequest {
//   ticketId: string;
//   fileIds?: string[];
// }

// export interface DownloadAllResponse {
//   files: TicketFile[];
// }

// export const downloadAllTicketFiles = api<
//   DownloadAllRequest,
//   DownloadAllResponse
// >(
//   { expose: true, method: "POST", path: "/files/:ticketId", auth: false },
//   async (req) => {
//     // const userContext = await getUserContext();

//     if (!req.ticketId) {
//       throw APIError.invalidArgument("Ticket ID is required");
//     }
//     // Find in the DB
//     const files = await prisma.file.findMany({
//       where: {
//         ticketId: req.ticketId,
//       },
//     });

//     if (!files || !files.length) {
//       throw APIError.notFound("No files found for this ticket");
//     }

//     return { files: files } as DownloadAllResponse;
//   }
// );
