import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cardBrand, formatCard, formatExpiry, validCard, validExpiry, validCvc, caretAfterDigits } from '../src/components/featuregrid/checkout-fields.ts'

// Published test numbers: https://docs.stripe.com/testing#cards
// These verify format/checksum behavior only; this demo never contacts Stripe.
test('detects Visa, both Mastercard ranges and Amex without accepting unsupported prefixes', () => {
  for (const [number, brand] of [['4242424242424242', 'visa'], ['5555555555554444', 'mastercard'], ['2223003122003222', 'mastercard'], ['378282246310005', 'amex']]) {
    assert.equal(cardBrand(number), brand)
    assert.equal(validCard(number), true)
  }
  assert.equal(cardBrand('2220'), 'unknown')
  assert.equal(cardBrand('2221'), 'mastercard')
  assert.equal(cardBrand('2720'), 'mastercard')
  assert.equal(cardBrand('2721'), 'unknown')
  assert.equal(validCard('4242424242424241'), false)
  assert.equal(validCard('4242'), false)
  assert.equal(validCard('0000000000000000'), false)
})

test('formats pasted values and keeps logical caret positions across separators', () => {
  assert.equal(formatCard('4242-4242 4242 4242'), '4242 4242 4242 4242')
  assert.equal(formatCard('378282246310005'), '3782 822463 10005')
  assert.equal(formatCard('letters'), '')
  assert.equal(caretAfterDigits('4242 4242', 5), 6)
  assert.equal(caretAfterDigits('4242 4242', 0), 0)
  assert.equal(formatExpiry('9'), '09')
  assert.equal(formatExpiry('12/34'), '12 / 34')
})

test('expiry includes the current month, rejects expired dates and impossible months', () => {
  const now = new Date(2026, 8, 18)
  assert.equal(validExpiry('09 / 26', now), true)
  assert.equal(validExpiry('08 / 26', now), false)
  assert.equal(validExpiry('12 / 25', now), false)
  assert.equal(validExpiry('00 / 34', now), false)
  assert.equal(validExpiry('13 / 34', now), false)
  assert.equal(validExpiry('12 / 34', now), true)
  assert.equal(validExpiry('12 / 3', now), false)
})

test('security code length tracks the detected brand', () => {
  assert.equal(validCvc('123', 'visa'), true)
  assert.equal(validCvc('1234', 'mastercard'), false)
  assert.equal(validCvc('1234', 'amex'), true)
  assert.equal(validCvc('123', 'amex'), false)
  assert.equal(validCvc('abc', 'visa'), false)
})
