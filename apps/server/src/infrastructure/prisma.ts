import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('[Prisma Error] DATABASE_URL environment variable is missing! Please configure it in your environment.');
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});


