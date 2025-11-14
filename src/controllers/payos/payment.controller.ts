import { CreatePaymentLinkRequest, CreatePaymentLinkResponse, PaymentLink } from '@payos/node';
import { throwResponse } from '../../utils/response';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import payOS from '../../payos/config';
import { ICreatePaymentLinkPayload } from '../../types/payload';
import { NewPaymentLogType } from '../../drizzle/type';
import { db } from '../../drizzle/db';
import { paymentLogs, todoUsers, users, userTokens } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { sendFCM } from '../../utils/dailyNotiChecker';
import { thousandSeparator } from '../../utils/convert';

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
        description: `${userId}_${todoId}`,
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
                .where(eq(users.userId, paymentLogs.createdBy))
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
                    await sendFCM(
                        userToken.token,
                        'Quỹ đã được cập nhật 🙌 💰',
                        `${paidUser.fullName || paidUser.userId} đã góp **${thousandSeparator(
                            payLogs.amount,
                            'VND',
                        )}** vào quỹ! `,
                    );
                } catch (error) {
                    console.error(`Failed to send FCM to user ${userToken.userId}:`, error);
                }
            }
        }
    } else {
        throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Webhook payment log not found');
    }
};
