import { and, eq } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { todoLogs, todoOrders, todos, todoUsers, users } from '../../drizzle/schema';
import { TodoOrderType, TodoType } from '../../drizzle/type';
import { ETodoStatus } from '../../types/app';
import { EHttpCode, EStatusCodes } from '../../types/http';
import { throwResponse } from '../../utils/response';
import { getAllTodoController } from '..';

export const updateManageTodo = async (payload: Record<string, TodoOrderType[]>, userId: string) => {
    const modifiedPayload = Object.keys(payload).reduce(
        (acc, status) => {
            const todos = payload[status];
            todos.forEach((todo, index) => {
                acc.order.push({
                    id: todo.id,
                    order: todo.order,
                });
                acc.todo.push({
                    id: todo.id,
                    status: status,
                });
            });
            return acc;
        },
        { order: [], todo: [] } as {
            order: Array<{ id: number; order: number }>;
            todo: Array<{ id: number; status: string }>;
        },
    );

    await db.transaction(async (tx) => {
        for (const todo of modifiedPayload.todo) {
            await tx
                .update(todos)
                .set({ status: todo.status as ETodoStatus, updatedAt: new Date().toISOString() })
                .where(eq(todos.id, todo.id));
        }
    });

    await db.transaction(async (tx) => {
        for (const orderItem of modifiedPayload.order) {
            await tx.update(todoOrders).set({ order: orderItem.order }).where(eq(todoOrders.todoId, orderItem.id));
        }
    });

    const data = await getAllTodoController.getAllOnwer(userId);

    return data;
};

export const updateTodo = async (
    todoId: number,
    payload: Partial<
        Pick<
            TodoType,
            | 'title'
            | 'shortDescription'
            | 'description'
            | 'priority'
            | 'status'
            | 'type'
            | 'startDate'
            | 'endDate'
            | 'expectedAmount'
            | 'notify'
            | 'shared'
        >
    >,
    userId: string,
) => {
    if (!todoId || !userId) throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Payload');

    const [todo] = await db.select().from(todos).where(eq(todos.id, todoId)).limit(1);
    if (!todo) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Todo not found');
    if (todo.createdBy !== userId)
        throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.FORBIDDEN, 'Only the owner can edit this todo');

    const updates: Partial<TodoType> = {
        ...payload,
        startDate: payload.startDate ? new Date(payload.startDate).toISOString() : todo.startDate,
        endDate: payload.endDate
            ? new Date(payload.endDate).toISOString()
            : payload.endDate === null
              ? null
              : todo.endDate,
        updatedAt: new Date().toISOString(),
    };

    const [updated] = await db.update(todos).set(updates).where(eq(todos.id, todoId)).returning();

    await db.insert(todoLogs).values({
        todoId,
        action: 'UPDATED',
        note: `Updated todo fields`,
        performedBy: userId,
    });

    return getAllTodoController.getTodoById(todoId, userId);
};

export const addUserToTodo = async (todoId: number, targetUserId: string, requesterId: string) => {
    if (!todoId || !targetUserId || !requesterId)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Payload');

    const [todo] = await db.select().from(todos).where(eq(todos.id, todoId)).limit(1);
    if (!todo) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Todo not found');
    if (todo.createdBy !== requesterId)
        throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.FORBIDDEN, 'Only the owner can manage users');

    const [targetUser] = await db.select().from(users).where(eq(users.userId, targetUserId)).limit(1);
    if (!targetUser) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'User not found');

    const existing = await db
        .select()
        .from(todoUsers)
        .where(and(eq(todoUsers.todoId, todoId), eq(todoUsers.userId, targetUserId)))
        .limit(1);
    if (existing.length > 0)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'User is already a member');

    await db.insert(todoUsers).values({ todoId, userId: targetUserId });
    await db.insert(todoLogs).values({
        todoId,
        action: 'USER_ADDED',
        note: `Added user: ${targetUser.fullName || targetUserId}`,
        performedBy: requesterId,
    });

    return getAllTodoController.getTodoById(todoId, requesterId);
};

export const removeUserFromTodo = async (todoId: number, targetUserId: string, requesterId: string) => {
    if (!todoId || !targetUserId || !requesterId)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Payload');

    const [todo] = await db.select().from(todos).where(eq(todos.id, todoId)).limit(1);
    if (!todo) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Todo not found');
    if (todo.createdBy !== requesterId)
        throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.FORBIDDEN, 'Only the owner can manage users');
    if (targetUserId === requesterId)
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Owner cannot remove themselves');

    const [targetUser] = await db.select().from(users).where(eq(users.userId, targetUserId)).limit(1);

    await db.delete(todoUsers).where(and(eq(todoUsers.todoId, todoId), eq(todoUsers.userId, targetUserId)));
    await db.insert(todoLogs).values({
        todoId,
        action: 'USER_REMOVED',
        note: `Removed user: ${targetUser?.fullName || targetUserId}`,
        performedBy: requesterId,
    });

    return getAllTodoController.getTodoById(todoId, requesterId);
};
