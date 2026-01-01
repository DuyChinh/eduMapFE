// SePay Configuration
// These values should match the backend config
const sepayConfig = {
    bankAccount: import.meta.env.VITE_SEPAY_BANK_ACCOUNT || 'VQRQAGEDK0170',
    bankName: import.meta.env.VITE_SEPAY_BANK_NAME || 'MBBank',
    accountName: import.meta.env.VITE_SEPAY_ACCOUNT_NAME || 'TRAN QUANG TUNG',
    bankCode: import.meta.env.VITE_SEPAY_BANK_CODE || 'MB'
};

export default sepayConfig;

