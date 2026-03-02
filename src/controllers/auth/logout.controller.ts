import { db } from '../../drizzle/db';
import { userTokens } from '../../drizzle/schema';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import { setTokenCookie } from '../../utils/cookies';
import { and, eq } from 'drizzle-orm';

type LogOutPayload = {
    userId: string;
    platform?: string;
};

async function logOut(set: any, payload: LogOutPayload): Promise<ICommonResponse> {
    if (payload?.userId && payload?.platform) {
        const userToken = await db
            .select()
            .from(userTokens)
            .where(and(eq(userTokens.userId, payload.userId), eq(userTokens.platform, payload.platform || '')))
            .limit(1);
        if (userToken.length > 0) {
            await db
                .delete(userTokens)
                .where(and(eq(userTokens.userId, payload.userId), eq(userTokens.platform, payload.platform || '')));
        }
    }

    setTokenCookie(set, '', 0);
    return {
        code: EHttpCode.LOG_OUT,
        message: 'Signed Out',
        status: EStatusCodes.OK,
    };
}

export default logOut;
