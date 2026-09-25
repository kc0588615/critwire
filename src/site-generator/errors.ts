export class SiteGeneratorError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid-output'
      | 'media-reference'
      | 'not-configured'
      | 'refusal'
      | 'timeout',
  ) {
    super(message)
    this.name = 'SiteGeneratorError'
  }
}
