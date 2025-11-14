import { desc, eq } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { todoNotifications, todoOrders, todos, todoUsers } from '../../drizzle/schema';
import { NewTodoNotiType, NewTodoType, TodoOrderType, TodoType } from '../../drizzle/type';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import { throwResponse } from '../../utils/response';
import { ETodoStatus } from '../../types/app';
import dayjs from 'dayjs';
type CreateTodoResponseType = ICommonResponse & {
    data: TodoType & TodoOrderType;
};

async function create(
    payload: NewTodoType &
        NewTodoNotiType & {
            sharedWith?: string[];
        },
    userId: string,
): Promise<CreateTodoResponseType> {
    // Determine users to share the todo with
    const todoUsersToInsert = payload?.shared && payload.sharedWith ? [...payload.sharedWith, userId] : [userId];

    // Validation
    if (!payload.title || !payload.type || !userId || !payload.shortDescription)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Payload');
    if (payload?.startDate && payload?.endDate && new Date(payload.startDate) > new Date(payload.endDate))
        throw throwResponse(
            EStatusCodes.BAD_REQUEST,
            EHttpCode.INVALID_PAYLOAD,
            'Start date cannot be greater than end date',
        );

    // Ensure dates are either Date objects or null
    const processedPayload: NewTodoType = {
        ...payload,
        startDate: payload.startDate ? new Date(payload.startDate).toISOString() : null,
        endDate: payload.endDate ? new Date(payload.endDate).toISOString() : null,
        createdby: userId,
    };
    // Create the todo
    const [lastestNewTodo] = await db
        .select({
            order: todoOrders.order,
        })
        .from(todos)
        .innerJoin(todoOrders, eq(todos.id, todoOrders.todoId))
        .where(eq(todos.status, payload.status || ETodoStatus.NEW))
        .orderBy(desc(todoOrders.order))
        .limit(1);

    const [newTodo] = await db.insert(todos).values(processedPayload).returning();
    const [newTodoOrder] = await db
        .insert(todoOrders)
        .values({
            order: lastestNewTodo?.order ? lastestNewTodo.order + 1 : 1,
            todoId: newTodo.id,
        })
        .returning();

    await db.insert(todoUsers).values(
        todoUsersToInsert.map((userId) => ({
            todoId: newTodo.id,
            userId,
        })),
    );

    if (payload.notify) {
        const dayOfMonth = payload.notiType === 'monthly' ? dayjs(payload.notiTime).date() : null;
        const time = payload.notiType === 'monthly' ? dayjs(payload.notiTime).format('HH:mm') : payload.notiTime;
        await db.insert(todoNotifications).values({
            todoId: newTodo.id,
            userId,
            notiTime: time,
            notiType: payload.notiType,
            notiTitle: payload.notiTitle,
            notiMessage: payload.notiMessage,
            notiDayOfMonth: dayOfMonth,
        });
    }

    return {
        status: EStatusCodes.CREATED,
        code: EHttpCode.CREATE,
        message: 'Todo created successfully',
        data: {
            ...newTodo,
            ...newTodoOrder,
        },
    };
}

export default create;
