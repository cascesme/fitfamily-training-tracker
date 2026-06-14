let ctx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function playTone(ac: AudioContext, frequency: number, duration: number, gain: number, startTime: number): void {
  const osc = ac.createOscillator()
  const gainNode = ac.createGain()
  osc.connect(gainNode)
  gainNode.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.value = frequency
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playTick(): void {
  const ac = getAudioContext()
  playTone(ac, 800, 0.06, 0.3, ac.currentTime)
}

export function playSetComplete(): void {
  const ac = getAudioContext()
  const now = ac.currentTime
  playTone(ac, 880, 0.1, 0.5, now)
  playTone(ac, 1100, 0.1, 0.5, now + 0.12)
}

export function playTimeUp(): void {
  const ac = getAudioContext()
  const now = ac.currentTime
  playTone(ac, 880, 0.15, 0.6, now)
  playTone(ac, 660, 0.15, 0.6, now + 0.2)
  playTone(ac, 440, 0.15, 0.6, now + 0.4)
}
