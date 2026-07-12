import { describe, expect, it } from 'vitest'

import { parseTallyForm, validateOptionalTallyUrl } from '@/lib/tally/parseTallyForm'

describe('parseTallyForm', () => {
  it('parses a share URL', () => {
    const parsed = parseTallyForm('https://tally.so/r/wMzXab')
    expect(parsed).toEqual({
      embedUrl:
        'https://tally.so/embed/wMzXab?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1',
      formId: 'wMzXab',
      shareUrl: 'https://tally.so/r/wMzXab',
    })
  })

  it('parses an embed URL and strips query noise for ids', () => {
    const parsed = parseTallyForm(
      'https://tally.so/embed/abc123?alignLeft=1&transparentBackground=1',
    )
    expect(parsed?.formId).toBe('abc123')
    expect(parsed?.shareUrl).toBe('https://tally.so/r/abc123')
  })

  it('accepts a bare form id', () => {
    const parsed = parseTallyForm('wMzXab')
    expect(parsed?.formId).toBe('wMzXab')
    expect(parsed?.shareUrl).toBe('https://tally.so/r/wMzXab')
  })

  it('accepts www.tally.so hosts', () => {
    expect(parseTallyForm('https://www.tally.so/r/wMzXab')?.formId).toBe('wMzXab')
  })

  it('rejects non-Tally hosts', () => {
    expect(parseTallyForm('https://example.com/r/wMzXab')).toBeNull()
    expect(parseTallyForm('https://evil-tally.so/r/wMzXab')).toBeNull()
  })

  it('rejects empty or invalid values', () => {
    expect(parseTallyForm('')).toBeNull()
    expect(parseTallyForm(null)).toBeNull()
    expect(parseTallyForm('not a url')).toBeNull()
    expect(parseTallyForm('https://tally.so/')).toBeNull()
  })
})

describe('validateOptionalTallyUrl', () => {
  it('allows empty', () => {
    expect(validateOptionalTallyUrl('')).toBe(true)
    expect(validateOptionalTallyUrl(null)).toBe(true)
  })

  it('accepts valid tally urls', () => {
    expect(validateOptionalTallyUrl('https://tally.so/r/wMzXab')).toBe(true)
  })

  it('rejects invalid urls', () => {
    expect(validateOptionalTallyUrl('https://example.com/form')).toEqual(expect.any(String))
  })
})
