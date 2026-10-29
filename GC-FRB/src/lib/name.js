// Names are stored as separate fields: last_name, first_name, middle_name (optional), suffix (optional).
export const NAME_SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V']

// Letters (any language), spaces, dots, apostrophes and hyphens only.
export const NAME_PATTERN = /^[\p{L}][\p{L}\s.'’-]*$/u

const clean = (s) => (s || '').trim().replace(/\s+/g, ' ')

// "Juan", "Santos", "Dela Cruz", "Jr." -> "Juan Santos Dela Cruz Jr."
export const buildFullName = ({ firstName, middleName, lastName, suffix } = {}) =>
  [clean(firstName), clean(middleName), clean(lastName), clean(suffix)].filter(Boolean).join(' ')

// Works with the new split fields and with older records that only have full_name.
export const displayName = (user = {}) =>
  buildFullName({ firstName: user.first_name, middleName: user.middle_name, lastName: user.last_name, suffix: user.suffix }) ||
  user.full_name || ''

export const firstNameOf = (user = {}) => clean(user.first_name) || (user.full_name || '').split(' ')[0] || ''
