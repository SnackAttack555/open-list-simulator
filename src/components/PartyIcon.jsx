import { Bird, Cat, Dog, Fish } from 'lucide-react'

const ICONS = { cat: Cat, dog: Dog, bird: Bird, fish: Fish }

/** A party's animal, from Lucide. Colour comes from the surrounding `color`. */
export default function PartyIcon({ party, size = 24, ...rest }) {
  const Icon = ICONS[party.icon]
  return (
    <Icon aria-hidden="true" size={size} strokeWidth={2.25} absoluteStrokeWidth {...rest} />
  )
}
