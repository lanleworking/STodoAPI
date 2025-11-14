import { EHttpCode, EStatusCodes, ICommonResponse } from '../../types/http';
import { setTokenCookie } from '../../utils/cookies';

function logOut(set: any): ICommonResponse {
    setTokenCookie(set, '', 0);
    return {
        code: EHttpCode.LOG_OUT,
        message: 'Signed Out',
        status: EStatusCodes.OK,
    };
}

export default logOut;
