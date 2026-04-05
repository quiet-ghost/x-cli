import twitterText from "twitter-text"

export type CharacterCount = {
  weightedLength: number
  valid: boolean
  maxLength: number
  remaining: number
}

export function countPostCharacters(text: string): CharacterCount {
  const result = twitterText.parseTweet(text.normalize("NFC"))
  const maxLength = 280
  return {
    weightedLength: result.weightedLength,
    valid: result.valid,
    maxLength,
    remaining: maxLength - result.weightedLength,
  }
}
