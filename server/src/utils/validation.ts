// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength validation
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber
  );
};

// Sanitize string input (basic XSS prevention)
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > characters
    .substring(0, 1000); // Limit length
};

// Validate UUID
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate positive integer
export const isValidPositiveInteger = (value: any): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};

// Validate non-negative integer
export const isValidNonNegativeInteger = (value: any): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
};

// Validate role
export const isValidRole = (role: string): boolean => {
  return ['inventory_manager', 'warehouse_staff'].includes(role);
};

