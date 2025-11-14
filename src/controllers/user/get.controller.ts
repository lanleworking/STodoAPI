import { db } from '../../drizzle/db';
import { users } from '../../drizzle/schema';
import { ISelectRes } from '../../types/app';

export const getAllUserOptions = async (): Promise<ISelectRes[]> => {
    const allUser = await db
        .select({
            value: users.userId,
            label: users.fullName ?? users.userId,
        })
        .from(users);

    return allUser;
};
