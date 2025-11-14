export interface IJWTService {
    sign(payload: any): Promise<string>;
    verify(token: string): Promise<any>;
}

export enum EUserRole {
    USER = 0,
    ADMIN = 1,
}

export interface IUserJwt {
    userId: string;
    role: number;
    expiredTime: number;
}

export enum ETodoStatus {
    NEW = 'NEW',
    DOING = 'DOING',
    DONE = 'DONE',
}

export enum ETodoPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export enum ETodoType {
    PERSONAL = 'PERSONAL',
    FUND = 'FUND',
}

export interface ISelectRes {
    value: string;
    label: string | null;
}

export enum ELogAction {
    DONATE = 'DONATE',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    STATUS_CHANGE = 'STATUS_CHANGE',
}
