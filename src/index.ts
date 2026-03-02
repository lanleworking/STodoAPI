import { Elysia } from 'elysia';
import { pool } from './drizzle/db';
import cors from '@elysiajs/cors';
import staticPlugin from '@elysiajs/static';
import './firebase/config';
import cron from 'node-cron';
import { dailyNotiChecker } from './utils/dailyNotiChecker';
import { pendingPaymentChecker } from './controllers/payos/payment.controller';
import userRoute from './routes/protected/user.route';
import authRoute from './routes/public/auth.route';
import todoRoute from './routes/protected/todo.route';
import paymentRoute from './routes/protected/payment.route';
// init app
const app = new Elysia();
app.use(staticPlugin()).use(
    cors({
        origin: ['http://localhost:3000', process.env.CLIENT_URL!],
        credentials: true,
    }),
);
// routes
app.use(authRoute).use(todoRoute).use(paymentRoute).use(userRoute);

// db
pool.connect()
    .then(() => {
        console.log('🏓 | Connected to the database');
    })
    .catch((err: any) => {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    });

cron.schedule('*/1 * * * *', async () => {
    await dailyNotiChecker();
});

cron.schedule('*/1 * * * *', async () => {
    await pendingPaymentChecker();
});

app.listen({
    port: process.env.PORT!,
});
console.log(`🦊 Elysia is running at ${process.env.CODE_ENV}`);
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
