import assert from 'node:assert/strict'
import { test } from 'node:test'
import { joinBase, swapLang } from '../src/lib/paths.ts'
import { clampRange, formatSeconds } from '../src/lib/time.ts'

test('joinBase works at the root and under a folder', () => {
  assert.equal(joinBase('/', 'maker/'), '/maker/')
  assert.equal(joinBase('/sound-sticker-maker', 'maker/'), '/sound-sticker-maker/maker/')
  assert.equal(joinBase('/sound-sticker-maker/', '/og.png'), '/sound-sticker-maker/og.png')
  assert.equal(joinBase('/sound-sticker-maker'), '/sound-sticker-maker/')
})

const LANGS = ['en', 'ar', 'es', 'hi']

test('swapLang moves between languages, with English at the root', () => {
  assert.equal(swapLang('maker/', 'ar', LANGS), 'ar/maker/')
  assert.equal(swapLang('ar/maker/', 'en', LANGS), 'maker/')
  assert.equal(swapLang('es/maker/', 'hi', LANGS), 'hi/maker/')
  assert.equal(swapLang('', 'es', LANGS), 'es/')
  assert.equal(swapLang('ar/', 'en', LANGS), '')
  assert.equal(swapLang('/privacy/', 'ar', LANGS), 'ar/privacy/')
})

test('formatSeconds rounds to one decimal', () => {
  assert.equal(formatSeconds(4), '4.0')
  assert.equal(formatSeconds(9.96), '10.0')
  assert.equal(formatSeconds(-1), '0.0')
})

test('clampRange keeps the part inside the sound and within the limits', () => {
  assert.deepEqual(clampRange(0, 45, 60, 0.3, 30), { start: 0, end: 30 })
  assert.deepEqual(clampRange(-2, 5, 60, 0.3, 30), { start: 0, end: 5 })
  assert.deepEqual(clampRange(59.9, 60, 60, 0.3, 30), { start: 59.7, end: 60 })
  assert.deepEqual(clampRange(2, 2, 10, 0.3, 30), { start: 2, end: 2.3 })
  assert.deepEqual(clampRange(0, 1, 0.2, 0.3, 30), { start: 0, end: 0.2 })
})
