import jwt from '@elysiajs/jwt';
import Elysia, { t } from 'elysia';
import {
    createTodoController,
    deleteTodoController,
    getAllTodoController,
    updateTodoController,
    getUserController,
} from '../../controllers';
import { catchResponse } from '../../utils/response';
import { ICommonResponse } from '../../types/http';
import { IUserJwt } from '../../types/app';
import jwtVerify from '../../middlewares/jwtVerify';

const todoRoute = new Elysia({
    prefix: '/todo',
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
    .post('/create', async ({ body, set, user }) => {
        try {
            const res = await createTodoController(body as any, user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/all', async ({ set, user }) => {
        try {
            const res = await getAllTodoController.getAllOnwer(user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .put('/update/manage', async ({ body, set, user }) => {
        try {
            const res = await updateTodoController.updateManageTodo(body as any, user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/list', async ({ set, user }) => {
        try {
            const res = await getAllTodoController.getListTodo(user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .delete(
        '/delete',
        async ({ body, set, user }) => {
            try {
                const res = await deleteTodoController(body.todoId, user.userId);
                return res;
            } catch (error) {
                return catchResponse(set, error as ICommonResponse);
            }
        },
        {
            body: t.Object({
                todoId: t.Array(t.Number()),
            }),
        },
    )
    .get('/:todoId', async ({ params, set, user }) => {
        const { todoId } = params;
        try {
            const res = await getAllTodoController.getTodoById(Number(todoId), user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/payment-log/:todoId', async ({ params, query, set }) => {
        try {
            const res = await getAllTodoController.paymentLogsData({
                limit: query.limit ? Number(query.limit) : 5,
                page: query.page ? Number(query.page) : 1,
                todoId: Number(params.todoId),
            });
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/recent', async ({ set, user }) => {
        try {
            const res = await getAllTodoController.getRecentTodo(user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/barChartData', async ({ set, user }) => {
        try {
            const res = await getAllTodoController.getBarChartStatusData(user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/user-options', async ({ set }) => {
        try {
            const res = await getUserController.getAllUserOptions();
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .put('/:todoId/update', async ({ params, body, set, user }) => {
        try {
            const res = await updateTodoController.updateTodo(Number(params.todoId), body as any, user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .post('/:todoId/members', async ({ params, body, set, user }) => {
        try {
            const { userId: targetUserId } = body as { userId: string };
            const res = await updateTodoController.addUserToTodo(Number(params.todoId), targetUserId, user.userId);
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .delete('/:todoId/members/:userId', async ({ params, set, user }) => {
        try {
            const res = await updateTodoController.removeUserFromTodo(
                Number(params.todoId),
                params.userId,
                user.userId,
            );
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    })
    .get('/:todoId/donation-chart', async ({ params, set }) => {
        try {
            const res = await getAllTodoController.getDonationChartByTodo(Number(params.todoId));
            return res;
        } catch (error) {
            return catchResponse(set, error as ICommonResponse);
        }
    });

export default todoRoute;
