import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

export default defineConfig({
    out: './drizzle',
    schema: './src/drizzle/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DB_URL!,
    },
});
