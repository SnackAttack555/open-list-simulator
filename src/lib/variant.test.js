import { describe, it, expect } from 'vitest'
import { resolveTheme, resolveViz } from './variant.js'
import { DEFAULT_VIZ } from '../config.js'

/**
 * These are the survey links. A wrong answer here doesn't crash anything — it
 * quietly serves one arm of a study the other arm's stimulus, which is the one
 * failure the whole design is trying to make impossible. Hence the precedence
 * table gets tested case by case rather than by eyeballing the resolver.
 */
describe('resolveViz precedence', () => {
  it('takes a valid URL parameter and stores it', () => {
    expect(resolveViz({ search: '?viz=bars' })).toEqual({
      viz: 'bars',
      store: 'bars',
      warn: null,
    })
  })

  it('lets the URL overwrite a different stored arm', () => {
    const { viz, store } = resolveViz({ search: '?viz=dots', stored: 'bars' })
    expect(viz).toBe('dots')
    expect(store).toBe('dots')
  })

  it('falls back to the stored arm when there is no parameter', () => {
    expect(resolveViz({ search: '', stored: 'bars' })).toEqual({
      viz: 'bars',
      store: null,
      warn: null,
    })
  })

  it('falls back to the default with neither', () => {
    expect(resolveViz({}).viz).toBe(DEFAULT_VIZ)
    expect(resolveViz({ search: '?other=1' }).viz).toBe('dots')
  })

  it('treats an unrecognised value as absent, warns, and leaves storage alone', () => {
    const { viz, store, warn } = resolveViz({ search: '?viz=garbage', stored: 'bars' })
    expect(viz).toBe('bars') // the typo must not knock a respondent out of their arm
    expect(store).toBeNull()
    expect(warn).toMatch(/garbage/)
  })

  it('does not warn when the parameter is simply missing or empty', () => {
    expect(resolveViz({ search: '' }).warn).toBeNull()
    expect(resolveViz({ search: '?viz=' }).warn).toBeNull()
  })

  it('ignores an unrecognised stored value', () => {
    expect(resolveViz({ search: '', stored: 'wat' }).viz).toBe(DEFAULT_VIZ)
    expect(resolveViz({ search: '', stored: null }).viz).toBe(DEFAULT_VIZ)
  })

  it('accepts sloppy casing, whitespace and singular aliases', () => {
    for (const search of ['?VIZ=BARS', '?viz=Bars', '?viz=%20bars%20', '?viz=bar', '?Viz=BaR']) {
      expect(resolveViz({ search }).viz, search).toBe('bars')
    }
    for (const search of ['?viz=DOTS', '?viz=dot']) {
      expect(resolveViz({ search }).viz, search).toBe('dots')
    }
  })

  it('finds the parameter among the tracking junk survey tools append', () => {
    const search = '?PID=abc123&viz=bars&utm_source=panel&utm_campaign=x'
    expect(resolveViz({ search }).viz).toBe('bars')
  })

  it('survives a search string with no leading question mark', () => {
    expect(resolveViz({ search: 'viz=bars' }).viz).toBe('bars')
  })
})

describe('resolveTheme', () => {
  const ids = ['hogwarts', 'detroit', 'cats']

  it('returns a known id, case-insensitively', () => {
    expect(resolveTheme('?theme=detroit', ids)).toBe('detroit')
    expect(resolveTheme('?THEME=Detroit', ids)).toBe('detroit')
    expect(resolveTheme('?theme=%20detroit', ids)).toBe('detroit')
  })

  it('returns null for anything else, so the picker still shows', () => {
    expect(resolveTheme('?theme=nonsense', ids)).toBeNull()
    expect(resolveTheme('?theme=', ids)).toBeNull()
    expect(resolveTheme('', ids)).toBeNull()
    expect(resolveTheme('?viz=bars', ids)).toBeNull()
    expect(resolveTheme('?theme=detroit', [])).toBeNull()
  })
})
