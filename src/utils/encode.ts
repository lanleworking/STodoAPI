import { createHash, timingSafeEqual } from 'crypto';

export const isMatchHash = (text1: string, text2: string): boolean => {
    const isMatch = timingSafeEqual(Buffer.from(text1, 'hex'), Buffer.from(text2, 'hex'));
    return isMatch;
};

export const encodeOneWay = (text: string): string => {
    const hash = createHash('sha256').update(text).digest('hex');
    return hash;
};

export const encodeTwoWay = (payload: string): string => {
    const jsonString = JSON.stringify(payload);
    return Buffer.from(jsonString, 'utf8').toString('base64');
};

export const decodeTwoWay = (token: string): any | null => {
    try {
        const decodedString = Buffer.from(token, 'base64').toString('utf8');
        const payload = JSON.parse(decodedString);
        return JSON.parse(payload);
    } catch (err) {
        console.error('Invalid token format:', err);
        return null;
    }
};
