import { eq } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { todoOrders, todos } from '../../drizzle/schema';
import { TodoOrderType } from '../../drizzle/type';
import { ETodoStatus } from '../../types/app';
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
                .set({ status: todo.status as ETodoStatus, updatedAt: new Date() })
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
