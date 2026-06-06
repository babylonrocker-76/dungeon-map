/** Frazione della larghezza mappa usata come diametro pedina (vista Master ~1.1%) */
export const TOKEN_MAP_RATIO = 0.011;
/** Scala pedine in vista Giocatore rispetto al Master */
export const TOKEN_PLAYER_SCALE = 0.58;

export function getDefaultTokenSize(mapWidth) {
  if (!mapWidth) return 36;
  return Math.round(Math.min(90, Math.max(22, mapWidth * TOKEN_MAP_RATIO)));
}

export function getTokenDisplaySize(_token, mapWidth) {
  return getDefaultTokenSize(mapWidth);
}

export const TOKEN_CATEGORIES = [
  {
    id: 'heroes',
    label: 'Personaggi',
    ringColor: '#c9a227',
    tokens: [
      { type: 'fighter', label: 'Guerriero', icon: '⚔', color: '#8b4513' },
      { type: 'wizard', label: 'Mago', icon: '✦', color: '#4a3d8f' },
      { type: 'rogue', label: 'Ladro', icon: '🗡', color: '#2d4a2d' },
      { type: 'cleric', label: 'Chierico', icon: '✚', color: '#c9a227' },
      { type: 'ranger', label: 'Ranger', icon: '🏹', color: '#3d6b3d' },
      { type: 'bard', label: 'Bardo', icon: '♪', color: '#8b3a62' },
      { type: 'paladin', label: 'Paladino', icon: '🛡', color: '#b8860b' },
      { type: 'barbarian', label: 'Barbaro', icon: '⚡', color: '#8b2500' },
      { type: 'druid', label: 'Druido', icon: '🌿', color: '#2e6b3e' },
      { type: 'warlock', label: 'Warlock', icon: '👁', color: '#4a1942' },
      { type: 'monk', label: 'Monaco', icon: '☯', color: '#6b5a2d' },
      { type: 'sorcerer', label: 'Stregone', icon: '🔥', color: '#9b3a1a' },
    ],
  },
  {
    id: 'monsters',
    label: 'Mostri',
    ringColor: '#9b3a3a',
    tokens: [
      { type: 'goblin', label: 'Goblin', icon: '👹', color: '#3d6b2d' },
      { type: 'orc', label: 'Orco', icon: '💪', color: '#2d5a1a' },
      { type: 'skeleton', label: 'Scheletro', icon: '💀', color: '#6b6b5a' },
      { type: 'zombie', label: 'Zombie', icon: '🧟', color: '#4a5a3d' },
      { type: 'wolf', label: 'Lupo', icon: '🐺', color: '#5a5a6b' },
      { type: 'spider', label: 'Ragno', icon: '🕷', color: '#2a1a1a' },
      { type: 'dragon', label: 'Drago', icon: '🐉', color: '#8b1a1a' },
      { type: 'demon', label: 'Demone', icon: '😈', color: '#5a1020' },
    ],
  },
  {
    id: 'misc',
    label: 'NPC e oggetti',
    ringColor: '#7a8a9a',
    tokens: [
      { type: 'npc', label: 'NPC', icon: '👤', color: '#5a6b7a' },
      { type: 'boss', label: 'Boss', icon: '👑', color: '#8b6914' },
      { type: 'chest', label: 'Forziere', icon: '📦', color: '#6b4a1a' },
      { type: 'trap', label: 'Trappola', icon: '⚠', color: '#8b3030' },
      { type: 'campfire', label: 'Fuoco', icon: '🔥', color: '#9b4a10' },
      { type: 'shrine', label: 'Altare', icon: '⛩', color: '#6b5a8b' },
    ],
  },
  {
    id: 'markers',
    label: 'Marcatori',
    ringColor: '#a0a0a0',
    tokens: [
      { type: 'marker-red', label: 'Rosso', icon: '●', color: '#c03030' },
      { type: 'marker-blue', label: 'Blu', icon: '●', color: '#3060c0' },
      { type: 'marker-green', label: 'Verde', icon: '●', color: '#30a050' },
      { type: 'marker-yellow', label: 'Giallo', icon: '●', color: '#c0a020' },
      { type: 'marker-purple', label: 'Viola', icon: '●', color: '#8040b0' },
      { type: 'marker-white', label: 'Bianco', icon: '●', color: '#e8e0d0' },
    ],
  },
];

const tokenMap = new Map();
const categoryByType = new Map();
for (const cat of TOKEN_CATEGORIES) {
  for (const t of cat.tokens) {
    tokenMap.set(t.type, t);
    categoryByType.set(t.type, cat);
  }
}

export function getTokenDef(type) {
  return tokenMap.get(type) || { type, label: type, icon: '?', color: '#5a5a5a' };
}

export function getTokenMeta(type) {
  const def = getTokenDef(type);
  const cat = categoryByType.get(type);
  const isMarker = type?.startsWith('marker-');
  return {
    ...def,
    category: cat?.id || 'misc',
    ringColor: isMarker ? def.color : (cat?.ringColor || '#c9a227'),
    isMarker,
  };
}
