export enum EStatusCodes {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500,
}
export enum EHttpCode {
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_PAYLOAD = 'INVALID_PAYLOAD',
    NOT_FOUND = 'NOT_FOUND',
    EXIST = 'EXIST',
    CREATE = 'CREATE',
    SAVE_ERROR = 'SAVE_ERROR',
    DELETED = 'DELETED',
    DELETE_ERROR = 'DELETE_ERROR',
    AUTHORIZED = 'AUTHORIZED',
    LOG_OUT = 'LOG_OUT',
    SERVER_ERROR = 'SERVER_ERROR',
    UPDATED = 'UPDATED',
    NO_CONTENT = 'NO_CONTENT',
}

export interface ICommonResponse {
    status: EStatusCodes;
    code: EHttpCode;
    message: string;
}
