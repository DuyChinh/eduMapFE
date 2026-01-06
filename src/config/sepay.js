// SePay Configuration
// These values should match the backend config
const sepayConfig = {
    bankAccount: import.meta.env.VITE_SEPAY_BANK_ACCOUNT,
    bankName: import.meta.env.VITE_SEPAY_BANK_NAME,
    accountName: import.meta.env.VITE_SEPAY_ACCOUNT_NAME ,
    bankCode: import.meta.env.VITE_SEPAY_BANK_CODE
};

export default sepayConfig;

