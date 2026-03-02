import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DB_URL!);

const pool = db.$client;

export { pool, db };
