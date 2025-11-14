import dayjs from 'dayjs';
import { db } from '../drizzle/db';
import { todoNotifications, todoUsers, userTokens } from '../drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { messaging } from '../firebase/config';

export const dailyNotiChecker = async () => {
    const now = new Date();
    const time = dayjs(now).format('HH:mm');
    const day = dayjs(now).date();

    const daily = await db
        .select({
            token: userTokens.token,
            title: todoNotifications.notiTitle,
            body: todoNotifications.notiMessage,
        })
        .from(todoNotifications)
        .innerJoin(userTokens, eq(todoNotifications.userId, userTokens.userId))
        .where(and(eq(todoNotifications.notiType, 'daily'), eq(todoNotifications.notiTime, time)));

    const monthly = await db
        .select({
            token: userTokens.token,
            title: todoNotifications.notiTitle,
            body: todoNotifications.notiMessage,
        })
        .from(todoNotifications)
        .innerJoin(userTokens, eq(todoNotifications.userId, userTokens.userId))
        .where(
            and(
                eq(todoNotifications.notiType, 'monthly'),
                eq(todoNotifications.notiTime, time),
                eq(todoNotifications.notiDayOfMonth, day),
            ),
        );

    const allNoti = [...daily, ...monthly];

    for (const n of allNoti) {
        await sendFCM(n.token, n.title!, n.body!);
    }
};

export const sendFCM = async (token: string, title: string, body: string) => {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: token,
    };

    try {
        await messaging.send(message);
    } catch (error) {
        console.error('Error sending FCM message:', error);
    }
};
