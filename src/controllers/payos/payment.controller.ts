import { CreatePaymentLinkRequest, CreatePaymentLinkResponse, PaymentLink } from '@payos/node';
import { throwResponse } from '../../utils/response';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import payOS from '../../payos/config';
import { ICreatePaymentLinkPayload } from '../../types/payload';
import { NewPaymentLogType } from '../../drizzle/type';
import { db } from '../../drizzle/db';
import { paymentLogs, todos, todoUsers, users, userTokens } from '../../drizzle/schema';
import { count, desc, eq } from 'drizzle-orm';
import { sendFCM } from '../../utils/dailyNotiChecker';
import { thousandSeparator } from '../../utils/convert';
import { PAYMENT_EXPIRE_MINUTES } from '../../constants/payment';

const sendFCMWithRetry = async (
    token: string,
    title: string,
    body: string,
    maxRetries = 3,
    delayMs = 500,
): Promise<void> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await sendFCM(token, title, body);
            return;
        } catch (error) {
            lastError = error;
            console.warn(`FCM attempt ${attempt}/${maxRetries} failed:`, error);
            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
            }
        }
    }
    throw lastError;
};

export const createPaymentLink = async (
    payload: ICreatePaymentLinkPayload,
    userId: string,
): Promise<CreatePaymentLinkResponse | undefined> => {
    if (!userId || !payload.todoId || !payload.amount)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'User ID is required');
    const now = Date.now();
    const { todoId, note, ...rest } = payload;
    const modifyPayload: CreatePaymentLinkRequest = {
        ...rest,
        orderCode: now,
        description: note || `Payment for todo #${todoId}`,
        cancelUrl: 'https://yourdomain.com/cancel',
        returnUrl: 'https://yourdomain.com/success',
    };

    const paymentLink = await payOS.paymentRequests.create(modifyPayload);
    const paymentLog: NewPaymentLogType = {
        amount: payload.amount,
        createdBy: userId,
        todoId: payload.todoId,
        paymentLinkId: paymentLink.paymentLinkId,
        status: paymentLink.status,
        note: note || '',
        qrCode: paymentLink.qrCode || '',
    };
    await db.insert(paymentLogs).values(paymentLog);

    return paymentLink;
};

export const cancelPaymentLink = async (paymentRequestId: string): Promise<ICommonResponse> => {
    if (!paymentRequestId)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.SERVER_ERROR, 'Payment Request ID is required');
    try {
        await payOS.paymentRequests.cancel(paymentRequestId);
        await db
            .update(paymentLogs)
            .set({ status: 'CANCELLED' })
            .where(eq(paymentLogs.paymentLinkId, paymentRequestId));
        return {
            message: 'Payment request cancelled successfully',
            code: EHttpCode.DELETED,
            status: EStatusCodes.OK,
        };
    } catch (error) {
        console.log(error);
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.SERVER_ERROR, (error as Error).message);
    }
};

export const getPayment = async (paymentId: string): Promise<PaymentLink> => {
    if (!paymentId) throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Payment ID is required');
    const data = await payOS.paymentRequests.get(paymentId);
    const [paymentLogData] = await db
        .select({
            id: paymentLogs.id,
            status: paymentLogs.status,
        })
        .from(paymentLogs)
        .where(eq(paymentLogs.paymentLinkId, data.id))
        .limit(1);

    if (paymentLogData) {
        await db.update(paymentLogs).set({ status: data.status }).where(eq(paymentLogs.id, paymentLogData.id));
        if (data.status.toLowerCase() === 'paid') {
            handlePaymentWebhook(data);
        }
    }
    return data;
};

export const getPaymentHistoryByUser = async (
    userId: string,
    page: number = 1,
    limit: number = 10,
): Promise<{
    data: {
        id: number;
        todoId: number;
        todoTitle: string | null;
        paymentLinkId: string;
        amount: number;
        status: string;
        note: string | null;
        qrCode: string | null;
        createdAt: string | null;
        updatedAt: string | null;
    }[];
    pagination: { page: number; limit: number; total: number; totalPage: number };
}> => {
    if (!userId) throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.INVALID_PAYLOAD, 'Invalid User');
    const offset = (page - 1) * limit;

    const [countResult] = await db
        .select({ total: count() })
        .from(paymentLogs)
        .where(eq(paymentLogs.createdBy, userId));

    const data = await db
        .select({
            id: paymentLogs.id,
            todoId: paymentLogs.todoId,
            todoTitle: todos.title,
            paymentLinkId: paymentLogs.paymentLinkId,
            amount: paymentLogs.amount,
            status: paymentLogs.status,
            note: paymentLogs.note,
            qrCode: paymentLogs.qrCode,
            createdAt: paymentLogs.createdAt,
            updatedAt: paymentLogs.updatedAt,
        })
        .from(paymentLogs)
        .innerJoin(todos, eq(paymentLogs.todoId, todos.id))
        .where(eq(paymentLogs.createdBy, userId))
        .orderBy(desc(paymentLogs.createdAt))
        .limit(limit)
        .offset(offset);

    return {
        data,
        pagination: {
            page,
            limit,
            total: Number(countResult.total),
            totalPage: Math.ceil(Number(countResult.total) / limit),
        },
    };
};

export const pendingPaymentChecker = async (): Promise<void> => {
    const pendingPayments = await db.select().from(paymentLogs).where(eq(paymentLogs.status, 'PENDING'));

    const now = Date.now();
    const EXPIRE_MS = PAYMENT_EXPIRE_MINUTES * 60 * 1000;

    for (const payment of pendingPayments) {
        try {
            const paymentData = await payOS.paymentRequests.get(payment.paymentLinkId);

            if (paymentData.status.toLowerCase() === 'paid') {
                await handlePaymentWebhook(paymentData);
            } else {
                const createdAt = new Date(payment.createdAt!).getTime();
                if (now - createdAt >= EXPIRE_MS) {
                    try {
                        await payOS.paymentRequests.cancel(payment.paymentLinkId);
                    } catch (_) {
                        // ignore if already cancelled on PayOS side
                    }
                    await db
                        .update(paymentLogs)
                        .set({ status: 'CANCELLED', updatedAt: new Date().toISOString() })
                        .where(eq(paymentLogs.id, payment.id));
                    console.log(`Auto-cancelled expired pending payment: ${payment.paymentLinkId}`);
                }
            }
        } catch (error) {
            console.error(`Failed to check pending payment ${payment.paymentLinkId}:`, error);
        }
    }
};

export const handlePaymentWebhook = async (paymentData: PaymentLink): Promise<void> => {
    const [payLogs] = await db.select().from(paymentLogs).where(eq(paymentLogs.paymentLinkId, paymentData.id)).limit(1);
    if (payLogs) {
        // Update payment log status
        await db
            .update(paymentLogs)
            .set({
                status: paymentData.status,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(paymentLogs.id, payLogs.id));

        // If payment is successful, notify users
        if (paymentData.status.toLowerCase() === 'paid') {
            // user just paid
            const [paidUser] = await db
                .select({
                    fullName: users.fullName,
                    userId: users.userId,
                })
                .from(users)
                .where(eq(users.userId, payLogs.createdBy))
                .limit(1);

            // Optimized query with joins to get all user tokens in one query
            const userTokensForTodo = await db
                .select({
                    userId: todoUsers.userId,
                    token: userTokens.token,
                    fullName: users.fullName,
                })
                .from(todoUsers)
                .innerJoin(userTokens, eq(todoUsers.userId, userTokens.userId))
                .innerJoin(users, eq(users.userId, todoUsers.userId))
                .where(eq(todoUsers.todoId, payLogs.todoId));

            // Send FCM notifications to all users
            for (const userToken of userTokensForTodo) {
                try {
                    await sendFCMWithRetry(
                        userToken.token,
                        'Quỹ đã được cập nhật 🙌 💰',
                        `${paidUser?.fullName || paidUser?.userId || 'Một thành viên'} đã góp **${thousandSeparator(
                            payLogs.amount,
                            'VND',
                        )}** vào quỹ! `,
                    );
                } catch (error) {
                    console.error(`Failed to send FCM to user ${userToken.userId} after all retries:`, error);
                }
            }
        }
    } else {
        throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Webhook payment log not found');
    }
};
