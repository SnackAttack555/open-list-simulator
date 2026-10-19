/**
 * A tiny timeline engine for a picture described by numbers in [0, 1].
 *
 *   createEngine({ start, steps, render, hold })
 *     start   { param: initialValue }
 *     steps   [{ dur, tracks: [[param, from, to, startMs, endMs], ...] }, ...]
 *             steps[k] takes the picture from phase k - 1 to phase k
 *     render  (values) => void, called every frame with the current numbers
 *     hold    ms to rest on a frame's end picture when crossing more than one
 *
 *   engine.setPhase(n, snap?)  animate from wherever the picture is to phase n
 *                              (n = -1 is the start state), forwards or mirrored
 *                              backwards; snap (or reduced motion) cuts straight
 *                              there. A change mid-flight first finishes what the
 *                              current frame still owes, so nothing jumps; a
 *                              change of more than one frame cuts to the frame
 *                              before and animates only the last.
 *   engine.phase               the phase the picture is at, or on its way to
 *   engine.stop()              cancel any animation
 */

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
const lerp = (a, b, t) => a + (b - a) * t

export function createEngine({ start, steps, render, hold = 900 }) {
  const last = steps.length - 1
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let P = { ...start }
  let target = -1
  let raf = 0
  let timer = 0

  const endState = (k) => {
    const out = { ...start }
    for (let i = 0; i <= k; i += 1) for (const tr of steps[i].tracks) out[tr[0]] = tr[2]
    return out
  }
  const stop = () => {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
  }

  const setPhase = (want, snap = false) => {
    const to = Math.max(-1, Math.min(last, Math.round(want)))
    stop()
    if (snap || reduced) {
      if (snap || Math.abs(to - target) <= 1) {
        target = to
        P = endState(to)
        render(P)
        return
      }
      const dir = to > target ? 1 : -1
      const step = () => {
        target += dir
        P = endState(target)
        render(P)
        if (target !== to) timer = setTimeout(step, hold)
      }
      step()
      return
    }
    if (to === target) return
    // More than one frame away (a fast scroll, a deep link): cut to the
    // neighbouring frame and animate only the last one, so the picture
    // catches up in one frame's time instead of replaying the whole story.
    if (Math.abs(to - target) > 1) {
      target = to > target ? to - 1 : to + 1
      P = endState(target)
    }
    const from = { ...P }
    const sched = []
    const owed = endState(target)
    for (const p of Object.keys(start)) {
      if (from[p] !== owed[p]) sched.push({ p, to: owed[p], t0: 0, t1: 350 })
    }
    let t = 0
    if (to > target) {
      for (let k = target + 1; k <= to; k += 1) {
        for (const tr of steps[k].tracks)
          sched.push({ p: tr[0], to: tr[2], t0: t + tr[3], t1: t + tr[4] })
        t += steps[k].dur + (k < to ? hold : 0)
      }
    } else {
      for (let k = target; k > to; k -= 1) {
        const D = steps[k].dur
        for (const tr of steps[k].tracks)
          sched.push({ p: tr[0], to: tr[1], t0: t + D - tr[4], t1: t + D - tr[3] })
        t += D + (k > to + 1 ? hold : 0)
      }
    }
    const END = t
    target = to
    const evaluate = (now) => {
      for (const p of Object.keys(start)) {
        let v = from[p]
        for (const tr of sched) {
          if (tr.p !== p) continue
          if (now >= tr.t1) v = tr.to
          else if (now > tr.t0) {
            v = lerp(v, tr.to, easeOutExpo(clamp((now - tr.t0) / (tr.t1 - tr.t0))))
            break
          } else break
        }
        P[p] = v
      }
    }
    const t0 = performance.now()
    const frame = (ts) => {
      const now = Math.min(ts - t0, END)
      evaluate(now)
      render(P)
      if (now < END) raf = requestAnimationFrame(frame)
    }
    evaluate(0)
    render(P)
    raf = requestAnimationFrame(frame)
  }

  render(P)
  return {
    setPhase,
    stop,
    get phase() {
      return target
    },
  }
}

export { clamp, easeOutExpo, lerp }
