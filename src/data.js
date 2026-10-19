/**
 * The one world this demo runs in: a town electing a five-seat council,
 * four parties of famous animals.
 *
 * The 99 simulated neighbors are dealt out after you vote, so that the story
 * always goes the same way: your party comes second, and the party that comes
 * first would sweep under winner-take-all. SHARES is the deal, one hand per
 * finishing place, in each party's candidate order (most famous first).
 *   - every election has exactly 100 votes, so a seat is exactly 20
 *   - the split is always 2 / 1 / 1 / 1, your party holding one seat
 *   - your single vote can never create a tie at a seat cutoff
 * election.test.js checks all of that for all 20 possible votes.
 *
 * `color` fills dots and icons; `text` is the darker shade that stays readable
 * as a word on cream paper.
 *
 * Names are plain text in a free educational parody. No logos, no art.
 */

export const SEATS = 5
export const NEIGHBORS = 99
export const VOTERS = NEIGHBORS + 1

/** Neighbors' votes per candidate, by finishing place. Index 1 is always yours. */
export const SHARES = [
  [13, 9, 7, 5, 3], // 37: the leader
  [9, 7, 5, 3, 2], // 26: your party, second
  [8, 6, 4, 3, 1], // 22
  [6, 4, 2, 1, 1], // 14
]
export const MY_PLACE = 1

export const PARTIES = [
  {
    id: 'cats',
    name: 'Cat Party',
    short: 'Cats',
    singular: 'cat',
    plural: 'cats',
    icon: 'cat',
    color: 'oklch(0.63 0.18 45)',
    text: 'oklch(0.5 0.17 45)',
    candidates: [
      { id: 'garfield', name: 'Garfield' },
      { id: 'puss', name: 'Puss in Boots' },
      { id: 'tom', name: 'Tom' },
      { id: 'cheshire', name: 'Cheshire Cat' },
      { id: 'grumpy', name: 'Grumpy Cat' },
    ],
  },
  {
    id: 'dogs',
    name: 'Dog Party',
    short: 'Dogs',
    singular: 'dog',
    plural: 'dogs',
    icon: 'dog',
    color: 'oklch(0.5 0.16 262)',
    text: 'oklch(0.44 0.16 262)',
    candidates: [
      { id: 'snoopy', name: 'Snoopy' },
      { id: 'scooby', name: 'Scooby-Doo' },
      { id: 'bluey', name: 'Bluey' },
      { id: 'lassie', name: 'Lassie' },
      { id: 'toto', name: 'Toto' },
    ],
  },
  {
    id: 'birds',
    name: 'Bird Party',
    short: 'Birds',
    singular: 'bird',
    plural: 'birds',
    icon: 'bird',
    color: 'oklch(0.7 0.15 85)',
    text: 'oklch(0.5 0.13 85)',
    candidates: [
      { id: 'bigbird', name: 'Big Bird' },
      { id: 'donald', name: 'Donald Duck' },
      { id: 'tweety', name: 'Tweety' },
      { id: 'hedwig', name: 'Hedwig' },
      { id: 'woodstock', name: 'Woodstock' },
    ],
  },
  {
    id: 'fish',
    name: 'Fish Party',
    short: 'Fish',
    singular: 'fish',
    plural: 'fish',
    icon: 'fish',
    color: 'oklch(0.56 0.12 185)',
    text: 'oklch(0.45 0.11 185)',
    candidates: [
      { id: 'nemo', name: 'Nemo' },
      { id: 'dory', name: 'Dory' },
      { id: 'jaws', name: 'Jaws' },
      { id: 'flounder', name: 'Flounder' },
      { id: 'marlin', name: 'Marlin' },
    ],
  },
]
