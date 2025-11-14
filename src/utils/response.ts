import { EHttpCode, EStatusCodes, ICommonResponse } from '../types/http';

export const throwResponse = (status: EStatusCodes, code: EHttpCode, message?: any): ICommonResponse => {
    return {
        status,
        code,
        message: message || 'Server Error',
    };
};

export const catchResponse = (set: any, error: ICommonResponse) => {
    const errorInfo = {
        timestamp: new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            dateStyle: 'medium',
            timeStyle: 'medium',
        }),
        error: error,
    };

    console.error('Error Details:', errorInfo);
    set.status = error.status;
    return error;
};
