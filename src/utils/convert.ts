export const thousandSeparator = (num: number, currencySymbol: string): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ` ${currencySymbol}`;
};
