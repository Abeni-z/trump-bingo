/**
 * Realistic bingo ball-mixer sound — hard plastic/resin ball collisions in a drum.
 * Synthesized with Web Audio API (noise bursts + resonant thumps).
 */
export function playShuffleMixSound(durationSec = 10) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return () => {}

  const ctx = new AudioCtx()
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)

  const start = ctx.currentTime
  const sources = []

  function track(node) {
    sources.push(node)
    return node
  }

  /** Sharp hard-ball clack: filtered noise + low body knock */
  function playHardClack(time, intensity = 1) {
    const dur = 0.035 + Math.random() * 0.055
    const peak = 0.28 * intensity + Math.random() * 0.12 * intensity

    const bufferSize = Math.ceil(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.exp(-i / (bufferSize * 0.12))
      data[i] = (Math.random() * 2 - 1) * env
    }

    const noise = track(ctx.createBufferSource())
    noise.buffer = buffer
    const bpf = ctx.createBiquadFilter()
    bpf.type = 'bandpass'
    bpf.frequency.value = 900 + Math.random() * 3200
    bpf.Q.value = 3 + Math.random() * 5
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 400 + Math.random() * 600
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(peak, time)
    ng.gain.exponentialRampToValueAtTime(0.001, time + dur)
    noise.connect(bpf).connect(hp).connect(ng).connect(master)
    noise.start(time)
    noise.stop(time + dur + 0.02)

    const osc = track(ctx.createOscillator())
    osc.type = 'square'
    const base = 90 + Math.random() * 220
    osc.frequency.setValueAtTime(base * 2.2, time)
    osc.frequency.exponentialRampToValueAtTime(base * 0.45, time + dur * 1.4)
    const og = ctx.createGain()
    og.gain.setValueAtTime(peak * 0.55, time)
    og.gain.exponentialRampToValueAtTime(0.001, time + dur * 1.1)
    osc.connect(og).connect(master)
    osc.start(time)
    osc.stop(time + dur * 1.5)
  }

  /** Heavier balls colliding — dual-tone metallic knock */
  function playHeavyKnock(time, intensity = 1) {
    const dur = 0.06 + Math.random() * 0.08
    const peak = 0.22 * intensity

    const osc1 = track(ctx.createOscillator())
    const osc2 = track(ctx.createOscillator())
    osc1.type = 'sawtooth'
    osc2.type = 'square'
    const f1 = 180 + Math.random() * 400
    osc1.frequency.setValueAtTime(f1, time)
    osc2.frequency.setValueAtTime(f1 * 1.7, time)
    osc1.frequency.exponentialRampToValueAtTime(f1 * 0.35, time + dur)
    osc2.frequency.exponentialRampToValueAtTime(f1 * 0.3, time + dur)

    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + dur)
    osc1.connect(g)
    osc2.connect(g)
    g.connect(master)
    osc1.start(time)
    osc2.start(time)
    osc1.stop(time + dur + 0.02)
    osc2.stop(time + dur + 0.02)
  }

  /** Continuous tumbler rumble while balls churn */
  function playChurnRumble(time, length, intensity) {
    const dur = length
    const bufferSize = Math.ceil(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6
    }

    const noise = track(ctx.createBufferSource())
    noise.buffer = buffer
    noise.loop = false
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 280 + Math.random() * 180
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.001, time)
    g.gain.linearRampToValueAtTime(0.08 * intensity, time + 0.08)
    g.gain.setValueAtTime(0.08 * intensity, time + dur - 0.15)
    g.gain.exponentialRampToValueAtTime(0.001, time + dur)
    noise.connect(lp).connect(g).connect(master)
    noise.start(time)
    noise.stop(time + dur + 0.05)
  }

  const phases = [
    { from: 0, to: 3, clacks: 95, heavies: 25, churns: 4, intensity: 1 },
    { from: 3, to: 7, clacks: 70, heavies: 18, churns: 3, intensity: 0.75 },
    { from: 7, to: durationSec, clacks: 35, heavies: 8, churns: 2, intensity: 0.45 },
  ]

  for (const phase of phases) {
    const span = phase.to - phase.from
    for (let i = 0; i < phase.clacks; i++) {
      const t = start + phase.from + Math.random() * span
      playHardClack(t, phase.intensity * (0.7 + Math.random() * 0.3))
    }
    for (let i = 0; i < phase.heavies; i++) {
      const t = start + phase.from + Math.random() * span
      playHeavyKnock(t, phase.intensity)
    }
    for (let i = 0; i < phase.churns; i++) {
      const t = start + phase.from + (span / phase.churns) * i + Math.random() * 0.3
      const len = 0.4 + Math.random() * 0.9
      playChurnRumble(t, len, phase.intensity)
    }
  }

  return () => {
    sources.forEach(s => {
      try { s.stop() } catch (_) { /* already stopped */ }
    })
    ctx.close().catch(() => {})
  }
}
