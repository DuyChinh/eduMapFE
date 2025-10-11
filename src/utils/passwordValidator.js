/**
 * Password validation function
 * Validates password according to API requirements
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Mật khẩu không được để trống');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  }
  
  if (password.length > 128) {
    errors.push('Mật khẩu không được quá 128 ký tự');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số');
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~`]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
  }
  
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Mật khẩu không được có hơn 2 ký tự giống nhau liên tiếp');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

/**
 * Get password strength
 * Returns strength level and color
 */
export const getPasswordStrength = (password) => {
  let score = 0;
  
  if (!password) return { level: 'Rất yếu', color: '#ff4d4f', percent: 0 };
  
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~`]/.test(password)) score += 10;
  
  if (score < 30) return { level: 'Yếu', color: '#ff4d4f', percent: 25 };
  if (score < 60) return { level: 'Trung bình', color: '#faad14', percent: 50 };
  if (score < 90) return { level: 'Tốt', color: '#1890ff', percent: 75 };
  return { level: 'Mạnh', color: '#52c41a', percent: 100 };
};

/**
 * Password validation rules for Ant Design Form
 * Returns validation rules array
 */
export const getPasswordValidationRules = (t) => [
  {
    required: true,
    message: t('login.passwordRequired')
  },
  {
    min: 8,
    message: t('register.passwordMinLength')
  },
  {
    max: 128,
    message: t('register.passwordMaxLength')
  },
  {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~`])/,
    message: t('register.passwordPattern')
  },
  {
    validator: (_, value) => {
      if (!value) return Promise.resolve();
      
      // Check for repeated characters (more than 2 consecutive)
      if (/(.)\1{2,}/.test(value)) {
        return Promise.reject(new Error(t('register.passwordNoRepeat')));
      }
      
      return Promise.resolve();
    }
  }
];

