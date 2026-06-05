export const WATABOU_GENERATORS = [
  {
    id: 'dungeon',
    label: 'One Page Dungeon',
    description: 'Dungeon su una pagina — ideale per one-shot',
    baseUrl: 'https://watabou.github.io/one-page-dungeon/',
    itchUrl: 'https://watabou.itch.io/one-page-dungeon',
    autoExport: true,
    tags: [
      { id: 'winding', label: 'Labirintico' },
      { id: 'cramped', label: 'Stretto' },
      { id: 'large', label: 'Grande' },
      { id: 'backdoor', label: 'Entrata secondaria' },
      { id: 'chaotic', label: 'Caotico' },
    ],
  },
  {
    id: 'city',
    label: 'Fantasy City',
    description: 'Città medievale con mura, fiumi e quartieri',
    baseUrl: 'https://watabou.github.io/city-generator/',
    itchUrl: 'https://watabou.itch.io/medieval-fantasy-city-generator',
    autoExport: true,
    defaultSize: 15,
    toggles: [
      { id: 'walls', label: 'Mura', default: 1 },
      { id: 'river', label: 'Fiume', default: 1 },
      { id: 'citadel', label: 'Cittadella', default: 0 },
      { id: 'coast', label: 'Costa', default: 0 },
    ],
  },
  {
    id: 'village',
    label: 'Village',
    description: 'Villaggio rurale con strade e campi',
    baseUrl: 'https://watabou.github.io/village-generator/',
    itchUrl: 'https://watabou.itch.io/village-generator',
    autoExport: false,
  },
  {
    id: 'cave',
    label: 'Cave / Glade',
    description: 'Grotte sotterranee e radure nella foresta',
    baseUrl: 'https://watabou.github.io/cave-generator/',
    itchUrl: 'https://watabou.itch.io/cave-generator',
    autoExport: false,
  },
  {
    id: 'dwelling',
    label: 'Dwellings',
    description: 'Edifici con planimetrie — taverne, case, castelli piccoli',
    baseUrl: 'https://watabou.github.io/dwellings/',
    itchUrl: 'https://watabou.itch.io/dwellings',
    autoExport: false,
  },
  {
    id: 'realm',
    label: 'Perilous Shores',
    description: 'Mappa overworld e regioni fantasy',
    baseUrl: 'https://watabou.github.io/perilous-shores/',
    itchUrl: 'https://watabou.itch.io/perilous-shores',
    autoExport: false,
  },
];

export function randomSeed() {
  return String(Math.floor(Math.random() * 1_000_000_000));
}

export function buildWatabouUrl(generator, { seed, exportPng, tags = [], citySize, cityToggles = {} }) {
  const url = new URL(generator.baseUrl);
  url.searchParams.set('seed', seed?.trim() || randomSeed());

  if (exportPng && generator.autoExport) {
    url.searchParams.set('export', 'png');
  }

  if (generator.id === 'dungeon' && tags.length) {
    url.searchParams.set('tags', tags.join(','));
  }

  if (generator.id === 'city') {
    url.searchParams.set('size', String(citySize || generator.defaultSize || 15));
    for (const toggle of generator.toggles || []) {
      const val = cityToggles[toggle.id] ?? toggle.default;
      url.searchParams.set(toggle.id, val ? '1' : '0');
    }
  }

  return url.toString();
}
