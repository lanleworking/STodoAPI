import { eq } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import { throwResponse } from '../../utils/response';
import { isEmpty } from 'lodash';
import { removeLocalFile } from '../../utils/localFile';

async function deleteAccount(userId: string): Promise<ICommonResponse> {
    if (!userId) throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'UserID not exist!');

    const user = await db
        .select({
            userId: users.userId,
            avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

    if (isEmpty(user)) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'User not exist!');
    if (user[0].avatarUrl) {
        await removeLocalFile(user[0].avatarUrl);
    }
    await db.delete(users).where(eq(users.userId, userId));

    return {
        code: EHttpCode.DELETED,
        message: 'Delete user successfully',
        status: EStatusCodes.OK,
    };
}

export default deleteAccount;
