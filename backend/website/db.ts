import { PrismaClient } from "@prisma/client";

// Setup DB connection
export const db = new PrismaClient()
