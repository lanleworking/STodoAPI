import { eq } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import { NewUserType } from '../../drizzle/type';
import { EHttpCode, EStatusCodes } from '../../types/http';
import { throwResponse } from '../../utils/response';
import { encodeOneWay } from '../../utils/encode';
import { IJWTService } from '../../types/app';
import { setTokenCookie } from '../../utils/cookies';
import { storeFile } from '../../utils/localFile';
import { getTokenExpiry } from '../../utils/token';

type RegisterType = NewUserType & {
    avtFile?: File;
};

const register = async (payload: RegisterType, jwt: IJWTService, set: any) => {
    let avtUrl = null;
    if (!payload.userId || !payload.password)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Payload');

    const { userId: userIdOrigin, password } = payload;
    const userId = userIdOrigin.toLowerCase();

    const isExist = await db
        .select({
            userId: users.userId,
        })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

    if (isExist.length > 0) throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.EXIST, 'Account exist!');

    if (payload?.avtFile) {
        avtUrl = await storeFile(userId, payload.avtFile);
    }

    const hashedPassword = encodeOneWay(password);
    const [user] = await db
        .insert(users)
        .values({
            ...payload,
            userId,
            password: hashedPassword,
            avatarUrl: avtUrl,
        })
        .returning();

    // token
    const { expiryTimestamp, expiresInSec } = getTokenExpiry();

    const token = await jwt.sign({
        userId,
        role: user.role,
        expiredTime: expiryTimestamp,
    });
    setTokenCookie(set, token, expiresInSec);

    const { password: _password, role, ...restData } = user;
    return restData;
};

export default register;
