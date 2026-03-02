import jwt from '@elysiajs/jwt';
import Elysia from 'elysia';

import { catchResponse } from '../../utils/response';
import { ICommonResponse } from '../../types/http';
import { paymentController } from '../../controllers';
import { IUserJwt } from '../../types/app';
import { ICreatePaymentLinkPayload } from '../../types/payload';
import jwtVerify from '../../middlewares/jwtVerify';

const paymentRoute = new Elysia({
    prefix: '/payment',
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
    .post('/createLink', async ({ set, body, user }) => {
        try {
            const res = await paymentController.createPaymentLink(body as ICreatePaymentLinkPayload, user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .post('/cancelPayment/:paymentId', async ({ set, params }) => {
        try {
            const res = await paymentController.cancelPaymentLink(params.paymentId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/get/:paymentId', async ({ set, params }) => {
        try {
            const res = await paymentController.getPayment(params.paymentId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/history', async ({ set, user, query }) => {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 10;
            const res = await paymentController.getPaymentHistoryByUser(user.userId, page, limit);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    });

export default paymentRoute;
