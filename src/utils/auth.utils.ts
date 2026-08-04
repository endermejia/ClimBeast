/**
 * Validates whether an email string has a basic valid format.
 */
export function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email.trim());
}

/**
 * Validates whether a password meets security requirements:
 * - Minimum 6 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special/symbol character
 */
export function isComplexPassword(p: string): boolean {
  return (
    p.length >= 6 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}
