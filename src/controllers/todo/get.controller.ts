import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../drizzle/db';
import { paymentLogs, todoOrders, todos, todoUsers, users } from '../../drizzle/schema';
import { EHttpCode, EStatusCodes } from '../../types/http';
import { throwResponse } from '../../utils/response';
import { TodoType } from '../../drizzle/type';

async function getAllOnwer(userId: string) {
    if (!userId) throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.INVALID_PAYLOAD, 'Invalid User');
    const allUserTodos = await db
        .select({
            id: todos.id,
            title: todos.title,
            description: todos.description,
            status: todos.status,
            priority: todos.priority,
            endDate: todos.endDate,
            order: todoOrders.order,
            type: todos.type,
        })
        .from(todos)
        .innerJoin(todoOrders, eq(todos.id, todoOrders.todoId))
        .where(eq(todos.createdBy, userId));

    const data = allUserTodos.reduce(
        (acc: Record<string, typeof allUserTodos>, todo) => {
            const status = todo.status;
            if (status !== null) {
                if (!acc[status]) acc[status] = [];
                acc[status].push(todo);
            }
            return acc;
        },
        {
            NEW: [],
            DOING: [],
            DONE: [],
        } as Record<string, typeof allUserTodos>,
    );

    return data;
}

const getListTodo = async (userId: string) => {
    if (!userId) throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.INVALID_PAYLOAD, 'Invalid User');
    const allUserTodos = await db
        .select({
            id: todos.id,
            title: todos.title,
            description: todos.description,
            status: todos.status,
            priority: todos.priority,
            endDate: todos.endDate,
            createdBy: todos.createdBy,
            type: todos.type,
            createdAt: todos.createdAt,
            startDate: todos.startDate,
            shortDescription: todos.shortDescription,
            avatarUrl: users.avatarUrl,
            fullName: users.fullName || users.userId,
            totalParticipants: sql<number>`0`,
        })
        .from(todoUsers)
        .innerJoin(todos, and(eq(todoUsers.todoId, todos.id), and(eq(todoUsers.userId, userId))))
        .innerJoin(users, eq(todos.createdBy, users.userId))
        .orderBy(desc(todoUsers.assignedAt), desc(todos.createdAt));

    // get total participants for each todo
    for (const todo of allUserTodos) {
        const totalParticipants = await db
            .select({
                total: sql<number>`count(*)`,
            })
            .from(todoUsers)
            .where(eq(todoUsers.todoId, todo.id));
        todo['totalParticipants'] = totalParticipants[0]?.total ?? 0;
    }

    return allUserTodos;
};

const getTodoById = async (
    todoId: number,
    userId: string,
): Promise<
    TodoType & {
        users: {
            userId: string;
            email: string | null;
            fullName: string | null;
            avatarUrl: string | null;
        }[];
        totalAmount: number;
    }
> => {
    if (!userId) throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.INVALID_PAYLOAD, 'Invalid User');

    const [todo] = await db.select().from(todos).where(eq(todos.id, todoId)).limit(1);

    if (!todo) throw throwResponse(EStatusCodes.NOT_FOUND, EHttpCode.NOT_FOUND, 'Todo Not Exist');

    const userInTodo = await db
        .select({
            userId: users.userId,
            email: users.email,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
        })
        .from(users)
        .innerJoin(todoUsers, and(eq(users.userId, todoUsers.userId), and(eq(todoUsers.todoId, todoId))));

    // total amount
    const total = await db
        .select({
            totalAmount: sql<number>`sum(${paymentLogs.amount})`,
        })
        .from(paymentLogs)
        .where(and(eq(paymentLogs.todoId, todoId), eq(paymentLogs.status, 'PAID')));

    return {
        ...todo,
        users: userInTodo,
        totalAmount: total[0]?.totalAmount ?? 0,
    };
};

export const paymentLogsData = async (payload: { todoId: number; limit: number; page: number }) => {
    if (!payload.todoId) throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid Todo');
    const { todoId, limit, page } = payload;
    const offset = (page - 1) * limit;

    const paymentLogData = await db
        .select({
            id: paymentLogs.id,
            amount: paymentLogs.amount,
            status: paymentLogs.status,
            note: paymentLogs.note,
            createdBy: paymentLogs.createdBy,
            createdAt: paymentLogs.createdAt,
            updatedAt: paymentLogs.updatedAt,
            fullName: users.fullName,
            userId: users.userId,
            avatarUrl: users.avatarUrl,
        })
        .from(paymentLogs)
        .innerJoin(users, eq(paymentLogs.createdBy, users.userId))
        .where(and(eq(paymentLogs.todoId, todoId), isNotNull(users.userId), eq(paymentLogs.status, 'PAID')))
        .orderBy(desc(paymentLogs.createdAt))
        .limit(limit)
        .offset(offset);

    return {
        data: paymentLogData,
        pagination: {
            page,
            limit,
            total: paymentLogData.length,
            totalPage: Math.ceil(paymentLogData.length / limit),
        },
    };
};

const getRecentTodo = async (userId: string) => {
    if (!userId) throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.INVALID_PAYLOAD, 'Invalid User');
    const allUserRecentTodos = await db
        .select({
            shared: todos.shared,
            id: todos.id,
            title: todos.title,
            description: todos.description,
            status: todos.status,
            priority: todos.priority,
            endDate: todos.endDate,
            createdBy: todos.createdBy,
            type: todos.type,
            createdAt: todos.createdAt,
            startDate: todos.startDate,
            shortDescription: todos.shortDescription,
            avatarUrl: users.avatarUrl,
            fullName: users.fullName || users.userId,
        })
        .from(todoUsers)
        .innerJoin(todos, and(eq(todoUsers.todoId, todos.id), and(eq(todoUsers.userId, userId))))
        .innerJoin(users, eq(todos.createdBy, users.userId))
        .orderBy(desc(todoUsers.assignedAt), desc(todos.createdAt))
        .limit(4);

    return allUserRecentTodos;
};

const getBarChartStatusData = async (userId: string) => {
    if (!userId) throw throwResponse(EStatusCodes.FORBIDDEN, EHttpCode.INVALID_PAYLOAD, 'Invalid User');

    const statusData = await db
        .select({
            status: todos.status,
            amount: sql<number>`count(*)`,
        })
        .from(todoUsers)
        .innerJoin(todos, eq(todoUsers.todoId, todos.id))
        .where(eq(todoUsers.userId, userId))
        .groupBy(todos.status);

    return statusData;
};

export { getAllOnwer, getListTodo, getTodoById, getRecentTodo, getBarChartStatusData };
