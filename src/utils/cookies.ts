const isProd = process.env.CODE_ENV === 'production';
export const setTokenCookie = (set: any, token: string, maxAge?: number) => {
    const sameSite = isProd ? 'None' : 'Lax';
    const secure = isProd ? 'Secure;' : '';
    set.headers['Set-Cookie'] = `token=${token}; Path=/; HttpOnly ;Max-Age=${maxAge}; SameSite=${sameSite}; ${secure}`;
};
