/** Small, local-only helpers for the landing-page checkout demonstration. */
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'unknown'
export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export function cardBrand(value: string): CardBrand {
  const digits = digitsOnly(value)
  if (/^4/.test(digits)) return 'visa'
  if (/^3[47]/.test(digits)) return 'amex'
  const prefix = Number(digits.slice(0, 4))
  if (/^5[1-5]/.test(digits) || (digits.length >= 4 && prefix >= 2221 && prefix <= 2720)) return 'mastercard'
  return 'unknown'
}

export function formatCard(value: string) {
  const digits = digitsOnly(value).slice(0, cardBrand(value) === 'amex' ? 15 : 19)
  const groups = cardBrand(digits) === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 3]
  let offset = 0
  return groups.map(length => {
    const group = digits.slice(offset, offset + length)
    offset += length
    return group
  }).filter(Boolean).join(' ')
}

export function validCard(value: string) {
  const digits = digitsOnly(value)
  const brand = cardBrand(digits)
  const lengths = brand === 'visa' ? [13, 16, 19] : brand === 'amex' ? [15] : brand === 'mastercard' ? [16] : []
  if (!lengths.includes(digits.length)) return false
  const sum = [...digits].reverse().reduce((total, digit, index) => {
    const number = Number(digit) * (index % 2 ? 2 : 1)
    return total + (number > 9 ? number - 9 : number)
  }, 0)
  return sum % 10 === 0
}

export function formatExpiry(value: string) {
  let digits = digitsOnly(value).slice(0, 4)
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits
}

export function validExpiry(value: string, now = new Date()) {
  const digits = digitsOnly(value)
  if (digits.length !== 4) return false
  const month = Number(digits.slice(0, 2))
  const year = 2000 + Number(digits.slice(2))
  return month >= 1 && month <= 12 && (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1))
}

export function validCvc(value: string, brand: CardBrand) {
  return new RegExp(`^\\d{${brand === 'amex' ? 4 : 3}}$`).test(value)
}

/** Restore the insertion point by digit index after adding grouping separators. */
export function caretAfterDigits(formatted: string, count: number) {
  if (count === 0) return 0
  let seen = 0
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted[index]) && ++seen === count) return index + 1
  }
  return formatted.length
}
