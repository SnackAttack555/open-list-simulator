/**
 * Every roster in the app lives here.
 *
 * Shape:
 *   { id, name, emoji, tagline, lists: [ { id, name, emoji, color, candidates: [{ id, name }] } ] }
 *
 * Rules that the rest of the codebase relies on:
 *   - `id` values are stable. They are written into the database, so renaming one
 *     orphans every vote already cast for it. Change a `name` freely; never an `id`.
 *   - Candidate ids need only be unique *within their own list*. Votes are keyed on
 *     (theme_id, list_id, candidate_id), so the same slug may appear on two lists.
 *   - 5 candidates per list. A list can never win more seats than it has candidates,
 *     and there are 5 seats, so 5 is the floor for a list that could sweep.
 *   - `color` is used for list headers and seat tokens. Keep them distinguishable
 *     within a theme and dark enough to carry white text.
 *
 * To add a theme: append one object to UNIVERSAL_THEMES. Nothing else needs to change.
 */

const c = (...names) => names.map((name) => ({ id: slug(name), name }))

function slug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents (Lidström -> lidstrom)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const UNIVERSAL_THEMES = [
  {
    id: 'hogwarts',
    name: 'Hogwarts Houses',
    emoji: '🏰',
    noun: 'person',
    nounPlural: 'people',
    tagline: 'Four houses',
    lists: [
      {
        id: 'gryffindor',
        name: 'Gryffindor',
        emoji: '⚡',
        color: '#8c1c13',
        candidates: c(
          'Harry Potter',
          'Hermione Granger',
          'Ron Weasley',
          'Neville Longbottom',
          'Minerva McGonagall',
        ),
      },
      {
        id: 'slytherin',
        name: 'Slytherin',
        emoji: '🐍',
        color: '#1b5e3f',
        candidates: c(
          'Draco Malfoy',
          'Severus Snape',
          'Bellatrix Lestrange',
          'Tom Riddle',
          'Horace Slughorn',
        ),
      },
      {
        id: 'hufflepuff',
        name: 'Hufflepuff',
        emoji: '🦡',
        color: '#8a6100',
        candidates: c(
          'Cedric Diggory',
          'Nymphadora Tonks',
          'Newt Scamander',
          'Pomona Sprout',
          'Hannah Abbott',
        ),
      },
      {
        id: 'ravenclaw',
        name: 'Ravenclaw',
        emoji: '🦅',
        color: '#1e3a8a',
        candidates: c(
          'Luna Lovegood',
          'Cho Chang',
          'Filius Flitwick',
          'Gilderoy Lockhart',
          'Moaning Myrtle',
        ),
      },
    ],
  },
  {
    id: 'starwars',
    name: 'Star Wars Factions',
    emoji: '🌌',
    noun: 'person',
    nounPlural: 'people',
    tagline: 'Five factions',
    lists: [
      {
        id: 'jedi',
        name: 'Jedi Order',
        emoji: '🔵',
        color: '#1d6fa5',
        candidates: c('Luke Skywalker', 'Obi-Wan Kenobi', 'Yoda', 'Grogu', 'Ahsoka Tano'),
      },
      {
        id: 'empire',
        name: 'Galactic Empire',
        emoji: '🔴',
        color: '#2c2f36',
        candidates: c(
          'Darth Vader',
          'Emperor Palpatine',
          'Grand Moff Tarkin',
          'Grand Admiral Thrawn',
          'Dedra Meero',
        ),
      },
      {
        id: 'rebels',
        name: 'Rebel Alliance',
        emoji: '⭐',
        color: '#c2410c',
        candidates: c(
          'Princess Leia',
          'Han Solo',
          'Chewbacca',
          'Lando Calrissian',
          'Jyn Erso',
        ),
      },
      {
        id: 'andor',
        name: 'The Andor Crew',
        emoji: '🕯️',
        color: '#5b6236',
        candidates: c(
          'Cassian Andor',
          'Luthen Rael',
          'Bix Caleen',
          'Mon Mothma',
          'Saw Gerrera',
        ),
      },
      {
        id: 'droids',
        name: 'Droids',
        emoji: '🤖',
        color: '#a16207',
        candidates: c('R2-D2', 'C-3PO', 'BB-8', 'K-2SO', 'IG-11'),
      },
    ],
  },
  {
    id: 'superheroes',
    name: 'Superheroes',
    emoji: '🦸',
    noun: 'person',
    nounPlural: 'people',
    tagline: 'Five teams',
    lists: [
      {
        id: 'avengers',
        name: 'Avengers',
        emoji: '🛡️',
        color: '#b91c1c',
        candidates: c('Iron Man', 'Captain America', 'Thor', 'Black Widow', 'Spider-Man'),
      },
      {
        id: 'justiceleague',
        name: 'Justice League',
        emoji: '⚡',
        color: '#1d4ed8',
        candidates: c('Superman', 'Batman', 'Wonder Woman', 'The Flash', 'Aquaman'),
      },
      {
        id: 'xmen',
        name: 'X-Men',
        emoji: '🧬',
        color: '#b45309',
        candidates: c('Wolverine', 'Storm', 'Professor X', 'Jean Grey', 'Nightcrawler'),
      },
      {
        id: 'guardians',
        name: 'Guardians of the Galaxy',
        emoji: '🚀',
        color: '#7e22ce',
        candidates: c('Star-Lord', 'Gamora', 'Rocket', 'Groot', 'Nebula'),
      },
      {
        id: 'villains',
        name: 'Supervillains',
        emoji: '😈',
        color: '#166534',
        candidates: c('Thanos', 'The Joker', 'Loki', 'Magneto', 'Harley Quinn'),
      },
    ],
  },
  {
    id: 'animation',
    name: 'Animated Movies',
    emoji: '🎬',
    noun: 'movie',
    nounPlural: 'movies',
    tagline: 'Five studios',
    lists: [
      {
        id: 'disney',
        name: 'Disney',
        emoji: '🏰',
        color: '#1e40af',
        candidates: c(
          'The Lion King',
          'Frozen',
          'Beauty and the Beast',
          'Aladdin',
          'Moana',
        ),
      },
      {
        id: 'pixar',
        name: 'Pixar',
        emoji: '💡',
        color: '#a16207',
        candidates: c('Toy Story', 'Finding Nemo', 'The Incredibles', 'Up', 'Inside Out'),
      },
      {
        id: 'dreamworks',
        name: 'DreamWorks',
        emoji: '🌙',
        color: '#166534',
        candidates: c(
          'Shrek',
          'How to Train Your Dragon',
          'Kung Fu Panda',
          'Madagascar',
          'The Prince of Egypt',
        ),
      },
      {
        id: 'ghibli',
        name: 'Studio Ghibli',
        emoji: '🌾',
        color: '#6d28d9',
        candidates: c(
          'Spirited Away',
          'My Neighbor Totoro',
          'Princess Mononoke',
          "Howl's Moving Castle",
          "Kiki's Delivery Service",
        ),
      },
      {
        id: 'illumination',
        name: 'Illumination',
        emoji: '🍌',
        color: '#b91c1c',
        candidates: c(
          'Despicable Me',
          'Minions',
          'The Secret Life of Pets',
          'Sing',
          'The Super Mario Bros. Movie',
        ),
      },
    ],
  },
  {
    id: 'animals',
    name: 'Famous Animals',
    emoji: '🐾',
    noun: 'animal',
    nounPlural: 'animals',
    tagline: 'Four teams',
    lists: [
      {
        id: 'cats',
        name: 'Team Cat',
        emoji: '🐈',
        color: '#c2410c',
        candidates: c('Garfield', 'Cheshire Cat', 'Tom', 'Grumpy Cat', 'Puss in Boots'),
      },
      {
        id: 'dogs',
        name: 'Team Dog',
        emoji: '🐕',
        color: '#4d7c0f',
        candidates: c('Snoopy', 'Scooby-Doo', 'Lassie', 'Bluey', 'Toto'),
      },
      {
        id: 'birds',
        name: 'Team Bird',
        emoji: '🐦',
        color: '#0e7490',
        candidates: c('Big Bird', 'Tweety', 'Donald Duck', 'Hedwig', 'Woodstock'),
      },
      {
        id: 'fish',
        name: 'Team Fish',
        emoji: '🐠',
        color: '#4338ca',
        candidates: c('Nemo', 'Dory', 'Marlin', 'Flounder', 'Jaws'),
      },
    ],
  },
]

export { slug, c as candidates }
