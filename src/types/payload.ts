import { CreatePaymentLinkRequest } from '@payos/node';

export interface ILoginPayload {
    username: string;
    password: string;
}

export interface ICreatePaymentLinkPayload extends CreatePaymentLinkRequest {
    todoId: number;
    note?: string;
}
