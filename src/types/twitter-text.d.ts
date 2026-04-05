declare module "twitter-text" {
  export function parseTweet(text: string): {
    weightedLength: number
    valid: boolean
    validRangeEnd: number
  }
}
