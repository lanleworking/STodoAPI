import { isEmpty } from 'lodash';
import { ILoginPayload } from '../../types/payload';
import { throwResponse } from '../../utils/response';
import { EHttpCode, EStatusCodes } from '../../types/http';
import { IJWTService } from '../../types/app';
import { db } from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import { eq, or } from 'drizzle-orm';
import { encodeOneWay, isMatchHash } from '../../utils/encode';
import { setTokenCookie } from '../../utils/cookies';
import { getTokenExpiry } from '../../utils/token';
import { protocol } from '../../utils/http';

const login = async (payload: ILoginPayload, jwt: IJWTService, set: any, host: string | undefined) => {
    if (isEmpty(payload) || !payload.username || !payload.password)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Login Payload');
    const { password, username } = payload;
    const usernameLower = username.toLowerCase();

    const [user] = await db
        .select()
        .from(users)
        .where(or(eq(users.userId, usernameLower), eq(users.email, usernameLower)));

    if (!user) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Account not exist!');

    const hashedPassword = encodeOneWay(password);
    if (!isMatchHash(hashedPassword, user.password))
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Credentials');

    const { expiryTimestamp, expiresInSec } = getTokenExpiry();
    const token = await jwt.sign({
        userId: user.userId,
        role: user.role,
        expiredTime: expiryTimestamp,
    });

    if (user.avatarUrl && host) {
        user.avatarUrl = `${protocol}${host}/${user.avatarUrl}`;
    }

    setTokenCookie(set, token, expiresInSec);
    const { password: _password, ...restData } = user;
    return restData;
};

export default login;
