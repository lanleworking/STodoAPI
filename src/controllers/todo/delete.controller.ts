import { isEmpty } from 'lodash';
import { throwResponse } from '../../utils/response';
import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import { db } from '../../drizzle/db';
import { todos } from '../../drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';

async function deleteTodo(todoId: number[], userId: string): Promise<ICommonResponse> {
    if (!userId || isEmpty(todoId))
        throw throwResponse(EStatusCodes.BAD_REQUEST, EHttpCode.INVALID_PAYLOAD, 'Invalid delete payload');

    await db.delete(todos).where(and(eq(todos.createdby, userId), inArray(todos.id, todoId)));
    return {
        status: EStatusCodes.OK,
        code: EHttpCode.DELETED,
        message: 'Todos deleted successfully',
    };
}

export default deleteTodo;
