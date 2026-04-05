declare module "twitter-text" {
  const twitterText: {
    parseTweet(text: string): {
      weightedLength: number
      valid: boolean
      validRangeEnd: number
    }
  }
  export default twitterText
}
