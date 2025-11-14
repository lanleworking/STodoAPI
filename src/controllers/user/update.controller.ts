import { eq } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import { removeLocalFile, storeFile } from '../../utils/localFile';
import { isEmpty } from 'lodash';
import { throwResponse } from '../../utils/response';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import { protocol } from '../../utils/http';
import { encodeOneWay } from '../../utils/encode';

export const updateAvt = async (
    payload: {
        newAvtFile: File;
    },
    userId: string,
    host: string | undefined,
) => {
    const [curUser] = await db.select().from(users).where(eq(users.userId, userId)).limit(1);

    if (curUser?.avatarUrl) {
        await removeLocalFile(curUser.avatarUrl);
    }
    if (!payload.newAvtFile) {
        await db.update(users).set({ avatarUrl: null }).where(eq(users.userId, userId));
        return {
            newAvtUrl: null,
        };
    } else {
        const newPath = await storeFile(userId, payload.newAvtFile);
        if (isEmpty(curUser)) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'User not found');
        await db
            .update(users)
            .set({
                avatarUrl: newPath,
            })
            .where(eq(users.userId, userId));
        return {
            newAvtUrl: host ? `${protocol}${host}/${newPath}` : newPath,
        };
    }
};

export const updatePassword = async (
    userId: string,
    payload: {
        currentPassword: string;
        newPassword: string;
    },
): Promise<ICommonResponse> => {
    if (!payload.currentPassword || !payload.newPassword)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Payload');
    const [curUser] = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
    if (isEmpty(curUser)) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'User not found');

    const hashedCurrentPassword = encodeOneWay(payload.currentPassword);
    if (curUser.password !== hashedCurrentPassword)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Current password is incorrect');

    const hashedNewPassword = encodeOneWay(payload.newPassword);
    await db.update(users).set({ password: hashedNewPassword }).where(eq(users.userId, userId));

    return {
        status: EStatusCodes.OK,
        code: EHttpCode.UPDATED,
        message: 'Update password successfully',
    };
};

export const updateFullname = async (userId: string, payload: { newName: string }) => {
    const [curUser] = await db.select().from(users).where(eq(users.userId, userId)).limit(1);
    if (isEmpty(curUser)) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'User not found');

    // update name
    if (!payload.newName) {
        await db.update(users).set({ fullName: null }).where(eq(users.userId, userId));
        return {
            newName: null,
        };
    } else {
        await db.update(users).set({ fullName: payload.newName }).where(eq(users.userId, userId));
        return {
            newName: payload.newName,
        };
    }
};
