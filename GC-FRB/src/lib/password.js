// Frontend password rules (used on Register and anywhere a new password is set).
// Login does NOT enforce these, so older accounts with simpler passwords can still sign in.
export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: '1 capital letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'num', label: '1 number', test: (p) => /\d/.test(p) },
  { id: 'sym', label: '1 symbol (e.g. ! @ # $ %)', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
]

export const failedPasswordRules = (p = '') => PASSWORD_RULES.filter((r) => !r.test(p))
export const isStrongPassword = (p = '') => failedPasswordRules(p).length === 0
