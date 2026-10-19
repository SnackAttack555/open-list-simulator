/**
 * Colour-coded names for use inside sentences. The colour is the same one the
 * party's dots and icon wear, so a reader can match a word to the picture.
 */
export function Party({ p, long = false, word }) {
  return (
    <b className="pn" style={{ color: p.text }}>
      {word ?? (long ? p.name : p.short)}
    </b>
  )
}

export function Cand({ c, p }) {
  return (
    <b className="pn" style={{ color: p.text }}>
      {c.name}
    </b>
  )
}
