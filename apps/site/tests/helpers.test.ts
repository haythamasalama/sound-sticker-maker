import { expect, test } from 'vitest'
import { joinBase, swapLang } from '../src/lib/paths'
import { clampRange, formatSeconds } from '../src/lib/time'

test('joinBase works at the root and under a folder', () => {
  expect(joinBase('/', 'maker/')).toBe('/maker/')
  expect(joinBase('/sound-sticker-maker', 'maker/')).toBe('/sound-sticker-maker/maker/')
  expect(joinBase('/sound-sticker-maker/', '/og.png')).toBe('/sound-sticker-maker/og.png')
  expect(joinBase('/sound-sticker-maker')).toBe('/sound-sticker-maker/')
})

const LANGS = ['en', 'ar', 'es', 'hi']

test('swapLang moves between languages, with English at the root', () => {
  expect(swapLang('maker/', 'ar', LANGS)).toBe('ar/maker/')
  expect(swapLang('ar/maker/', 'en', LANGS)).toBe('maker/')
  expect(swapLang('es/maker/', 'hi', LANGS)).toBe('hi/maker/')
  expect(swapLang('', 'es', LANGS)).toBe('es/')
  expect(swapLang('ar/', 'en', LANGS)).toBe('')
  expect(swapLang('/privacy/', 'ar', LANGS)).toBe('ar/privacy/')
})

test('formatSeconds rounds to one decimal', () => {
  expect(formatSeconds(4)).toBe('4.0')
  expect(formatSeconds(9.96)).toBe('10.0')
  expect(formatSeconds(-1)).toBe('0.0')
})

test('clampRange keeps the part inside the sound and within the limits', () => {
  expect(clampRange(0, 45, 60, 0.3, 30)).toEqual({ start: 0, end: 30 })
  expect(clampRange(-2, 5, 60, 0.3, 30)).toEqual({ start: 0, end: 5 })
  expect(clampRange(59.9, 60, 60, 0.3, 30)).toEqual({ start: 59.7, end: 60 })
  expect(clampRange(2, 2, 10, 0.3, 30)).toEqual({ start: 2, end: 2.3 })
  expect(clampRange(0, 1, 0.2, 0.3, 30)).toEqual({ start: 0, end: 0.2 })
})
