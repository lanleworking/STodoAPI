/**
 * Get token expiry in both forms: timestamp and seconds
 */
export const getTokenExpiry = () => {
    const seconds = Number(process.env.EXPIRED_TOKEN_SECONDS) || 0;
    const expiresInMs = seconds * 1000;
    const expiryTimestamp = Date.now() + expiresInMs;

    return {
        expiryTimestamp,
        expiresInSec: seconds,
    };
};
