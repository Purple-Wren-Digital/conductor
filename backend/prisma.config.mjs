import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

/** @type {import('prisma').PrismaConfig} */
const config = {
  schema: "./prisma/schema.prisma",
  studio: {
    adapter: () =>
      new PrismaPg({
        connectionString: process.env.SHADOW_DB_URL,
      }),
  },
};

export default config;
