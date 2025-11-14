import { EHttpCode, EStatusCodes } from '../types/http';
import { throwResponse } from '../utils/response';

const jwtVerify = async (token: any, jwt: any, set: any) => {
    const tokenValue = token.value;
    if (!tokenValue) {
        set.status = EStatusCodes.UNAUTHORIZED;
        throw throwResponse(EStatusCodes.UNAUTHORIZED, EHttpCode.UNAUTHORIZED, 'Unauthorized');
    }
    const user = await jwt.verify(tokenValue);
    if (!user) {
        set.status = EStatusCodes.UNAUTHORIZED;
        throw throwResponse(EStatusCodes.UNAUTHORIZED, EHttpCode.UNAUTHORIZED, 'Unauthorized');
    }
    return user;
};

export default jwtVerify;
