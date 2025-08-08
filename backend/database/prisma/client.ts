import { PrismaClient } from "./generated/prisma/client";

export const prisma = new PrismaClient(); // no adapter
// import { PrismaPg } from "@prisma/adapter-pg";

// // DB_URL must include &schema=tickets for the tickets service
// export const prisma = new PrismaClient({
//   adapter: new PrismaPg({ connectionString: process.env.DB_URL! }),
// });
