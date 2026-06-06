const LETTERS = ['B','I','N','G','O']

export function getLetterForNumber(n) {
  if (n <= 15) return 'B'
  if (n <= 30) return 'I'
  if (n <= 45) return 'N'
  if (n <= 60) return 'G'
  return 'O'
}

/**
 * Play a voice file from /voices/ directory.
 * Multiple voices can overlap — each call creates its own Audio instance.
 * @param {string} filename - filename without extension (e.g. "1", "winner", "begning")
 * @returns {Promise<void>}
 */
export function playVoice(filename) {
  return new Promise((resolve) => {
    const audio = new Audio(`/voices/${filename}.mp3`)

    audio.onended = () => {
      resolve()
    }
    audio.onerror = () => {
      console.warn(`Voice file not found: /voices/${filename}.mp3`)
      resolve()
    }

    audio.play().catch(err => {
      console.warn(`Could not play voice: ${filename}`, err)
      resolve()
    })
  })
}

/**
 * Play the voice for a called number (1-75).
 * Falls back to browser speech synthesis if voice file fails.
 */
export function speakNumber(number, language = 'en', enabled = true) {
  if (!enabled) return Promise.resolve()
  return playVoice(String(number))
}

/**
 * Play a special voice: 'begning', 'winner', 'not_winner', 'not_registered'
 */
export function playSpecialVoice(name) {
  return playVoice(name)
}

/**
 * Legacy speak function using browser speech synthesis (fallback).
 */
export function speak(number, language = 'en', enabled = true) {
  if (!enabled || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const letter = getLetterForNumber(number)
  const text = language === 'am'
    ? `${letter} ${number}`
    : `${letter} ${number}`
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = language === 'am' ? 'am-ET' : 'en-US'
  utt.rate = 0.85
  utt.pitch = 1.1
  window.speechSynthesis.speak(utt)
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}
