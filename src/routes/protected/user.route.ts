import jwt from '@elysiajs/jwt';
import Elysia, { t } from 'elysia';

import { catchResponse } from '../../utils/response';
import { ICommonResponse } from '../../types/http';
import { getUserController, updateUserController, userCreateController } from '../../controllers';
import { IUserJwt } from '../../types/app';
import jwtVerify from '../../middlewares/jwtVerify';

const userRoute = new Elysia({
    prefix: '/user',
})
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.SECRET_KEY!,
        }),
    )
    .derive(async ({ cookie: { token }, jwt, set }) => {
        const user = (await jwtVerify(token, jwt, set)) as IUserJwt;
        return { user };
    })
    .get('/options', async ({ set }) => {
        try {
            const res = await getUserController.getAllUserOptions();
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .put(
        '/avt',
        async ({ set, body, user, headers: { host } }) => {
            try {
                const res = await updateUserController.updateAvt(body as { newAvtFile: File }, user.userId, host);
                return res;
            } catch (error) {
                return catchResponse(set, error as ICommonResponse);
            }
        },
        {
            parse: 'multipart/form-data',
        },
    )
    .put('/pass', async ({ set, body, user }) => {
        try {
            const res = await updateUserController.updatePassword(
                user.userId,
                body as { currentPassword: string; newPassword: string },
            );
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .put('/fullname', async ({ set, body, user }) => {
        try {
            const res = await updateUserController.updateFullname(user.userId, body as { newName: string });
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .post(
        '/store-token',
        async ({ set, body, user }) => {
            try {
                const res = await userCreateController.storeFirebaseToken(user.userId, body);
                return res;
            } catch (error) {
                return catchResponse(set, error as ICommonResponse);
            }
        },
        {
            body: t.Object({
                token: t.String(),
                platform: t.String(),
            }),
        },
    );

export default userRoute;
