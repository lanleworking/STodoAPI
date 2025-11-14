import jwt from '@elysiajs/jwt';
import Elysia from 'elysia';
import {
    deleteAccountController,
    loginController,
    logOutController,
    registerController,
    verifyAccountController,
} from '../../controllers';
import { ILoginPayload } from '../../types/payload';
import { catchResponse } from '../../utils/response';
import { ICommonResponse } from '../../types/http';
import { NewUserType } from '../../drizzle/type';

const authRoute = new Elysia({
    prefix: '/auth',
})
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.SECRET_KEY!,
        }),
    )
    .post('/login', async ({ body, set, jwt, headers: { host } }) => {
        try {
            const user = await loginController(body as ILoginPayload, jwt, set, host);
            return user;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .post(
        '/register',
        async ({ body, set, jwt }) => {
            try {
                const newUser = await registerController(body as NewUserType, jwt, set);
                return newUser;
            } catch (error) {
                return catchResponse(set, error as ICommonResponse);
            }
        },
        {
            parse: 'multipart/form-data',
        },
    )
    .delete('/delete/:userId', async ({ set, params }) => {
        try {
            const userId = params.userId;
            const res = await deleteAccountController(userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/me', async ({ cookie: { token }, jwt, set, headers: { host } }) => {
        try {
            const res = await verifyAccountController(token.value as any, jwt, host);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .post('/logout', ({ set }) => {
        try {
            const res = logOutController(set);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    });

export default authRoute;
