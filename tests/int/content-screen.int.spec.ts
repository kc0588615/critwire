import { describe, expect, it } from 'vitest'

import { type ScreenResult, screenText } from '@/lib/moderation/screenText'

// One test per failure mode in the mission plan's "Failure modes" (S16).
// E2E can't enumerate these inputs cheaply, so the filter is tested here.

const OFFENSIVE = /^Offensive word: ".+"$/
const LINKS = /^\d+ links$/
const SHORTENED = /^Shortened link: \S+$/

const expectClean = async (text: string) => {
  expect(await screenText(text), text).toEqual({ flagged: false, reasons: [] })
}

const expectFlagged = async (text: string): Promise<ScreenResult> => {
  const result = await screenText(text)
  expect(result.flagged, text).toBe(true)
  return result
}

describe('screenText', () => {
  it('1. flags a profanity, a slur and a sexual term, alone, in a sentence and in any case', async () => {
    for (const word of ['fuck', 'FUCK', 'Fuck', 'nigger', 'retard', 'blowjob']) {
      const alone = await expectFlagged(word)
      expect(alone.reasons).toEqual([`Offensive word: "${word}"`])
      const inSentence = await expectFlagged(`The boss fight is ${word} broken after the patch.`)
      expect(inSentence.reasons).toEqual([`Offensive word: "${word}"`])
    }
  })

  it('2. flags leetspeak and look-alike spellings', async () => {
    for (const word of ['sh1t', 'a$$', 'f*ck']) {
      const result = await expectFlagged(`this update is ${word}`)
      expect(result.reasons).toEqual([`Offensive word: "${word}"`])
    }
  })

  it('3. passes ordinary words, a plain bug report and the empty string', async () => {
    for (const word of [
      'assassin',
      'Scunthorpe',
      'class',
      'analysis',
      'cocktail',
      'Hancock',
      'therapist',
      'grape',
      'Essex',
      'arsenal',
      'cockroach',
      'Hitchcock',
      'cockpit',
    ]) {
      await expectClean(word)
      await expectClean(`The ${word} level soft-locks after the second checkpoint.`)
    }
    await expectClean('The game crashes when I open the map on Steam Deck.')
    await expectClean('')
  })

  it('4. passes one or two links, each URL counted once', async () => {
    await expectClean('Clip: https://youtu.be/clip')
    await expectClean('https://www.a.com/x https://www.a.com/y')
    await expectClean('Clip https://youtu.be/clip and screenshot www.imgur.com/shot.png')
    await expectClean('Clip HTTP://WWW.YOUTUBE.COM/watch?v=1, screenshot http://i.imgur.com/a.png')
    await expectClean('See www.a.com/x and www.b.com/y')
  })

  it('5. flags three links in any mix, including the same URL three times', async () => {
    for (const text of [
      'https://a.com/1 https://b.com/2 https://c.com/3',
      'www.a.com, www.b.com and http://c.com',
      'https://a.com/x https://a.com/x https://a.com/x',
    ]) {
      const result = await expectFlagged(text)
      expect(result.reasons).toEqual(['3 links'])
    }
    expect((await expectFlagged('https://a.com https://b.com https://c.com https://d.com')).reasons).toEqual([
      '4 links',
    ])
  })

  it('6. flags a shortener with or without a scheme or www, and among ordinary links', async () => {
    for (const [text, host] of [
      ['https://bit.ly/x', 'bit.ly'],
      ['bit.ly/abc', 'bit.ly'],
      ['www.t.co/x', 't.co'],
      ['HTTPS://WWW.T.CO/x', 't.co'],
      ['see tinyurl.com/abc', 'tinyurl.com'],
      ['Clip https://youtu.be/clip and more at is.gd/y', 'is.gd'],
    ] as const) {
      const result = await expectFlagged(text)
      expect(result.reasons, text).toEqual([`Shortened link: ${host}`])
    }
  })

  it('7. does not count a look-alike host as a shortener, or a bare look-alike as a link', async () => {
    await expectClean('https://notbit.ly/x')
    await expectClean('https://bit.ly.example.com/x')
    // Bare look-alikes aren't links at all: with two real links they stay under three.
    await expectClean('notbit.ly/x at.co/y https://a.com/1 https://b.com/2')
  })

  it('8. gives every flagged result at least one reason', async () => {
    for (const text of ['fuck', 'sh1t', 'bit.ly/x', 'https://a.com https://b.com https://c.com']) {
      const result = await expectFlagged(text)
      expect(result.reasons.length, text).toBeGreaterThan(0)
    }
  })

  it('9. deduplicates reasons, caps offensive words at five and uses the documented wording', async () => {
    expect((await expectFlagged('shit shit SHIT')).reasons).toEqual(['Offensive word: "shit"'])
    expect((await expectFlagged('bit.ly/a https://bit.ly/b')).reasons).toEqual(['Shortened link: bit.ly'])

    const many = await expectFlagged('fuck shit cunt dick piss twat bastard')
    const offensive = many.reasons.filter((reason) => reason.startsWith('Offensive word:'))
    expect(offensive).toHaveLength(5)
    expect(new Set(many.reasons).size).toBe(many.reasons.length)

    const mixed = await expectFlagged('fuck https://a.com https://b.com bit.ly/c')
    for (const reason of mixed.reasons) {
      expect([OFFENSIVE, LINKS, SHORTENED].some((pattern) => pattern.test(reason)), reason).toBe(true)
    }
  })

  it('10. reports every kind of problem in mixed text', async () => {
    const result = await expectFlagged(
      'This fucking game https://a.com/1 https://b.com/2 bit.ly/3',
    )
    expect(result.reasons.some((reason) => OFFENSIVE.test(reason))).toBe(true)
    expect(result.reasons).toContain('3 links')
    expect(result.reasons).toContain('Shortened link: bit.ly')
  })

  it('11. does not count a prefixed bare look-alike as a shortener', async () => {
    await expectClean('my-bit.ly/x')
    await expectClean('foo.bit.ly/x')
    await expectClean('mirror at x.t.co/y')
  })
})
