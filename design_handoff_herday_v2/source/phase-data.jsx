// phase-data.jsx — Content source for the six Ogino sub-phases.
// All copy follows the brief's rules: hypothetical, clinical, no metaphor,
// no judgement on her.

const PHASES = [
  {
    id: 'menstruation',
    name: 'Phase menstruelle',
    short: 'Menstruation',
    parent: 'menstruelle',
    range: 'Jours 1 à 5',
    color: '#9c6a5c',
    colorSoft: '#e9d9d3',
    colorInk: '#5a3a32',
    posture: ['SOLIDE', 'FIABLE', 'DISCRET', 'LOGISTIQUE'],
    headline:
      "À ce moment du cycle, beaucoup de femmes ressentent une fatigue physique réelle et une moindre tolérance au bruit ou à la sollicitation.",
    observable: [
      'Sa tonalité physique : fatigue, sensibilité aux odeurs ou aux lumières fortes',
      'Son rythme : un besoin probable de ralentir',
      'Sa logistique domestique : ce qu’elle prend en charge habituellement',
    ],
    propose: [
      'Prendre le relais sans demander « je peux t’aider ? » — décider, exécuter',
      'Alléger la charge domestique (repas, courses, enfants)',
      'Proposer du temps calme : pas de soirée bruyante imposée',
    ],
    avoid: [
      'Faire des plans sociaux denses sans lui en parler en amont',
      'Lui demander de trancher un sujet logistique de fond',
      'Mentionner ses règles devant des tiers',
    ],
  },
  {
    id: 'post-menstruelle',
    name: 'Phase post-menstruelle',
    short: 'Post-menstruelle',
    parent: 'folliculaire',
    range: 'Quelques jours après les règles',
    color: '#8a9a82',
    colorSoft: '#dfe5d8',
    colorInk: '#3f4a3a',
    posture: ['DISPONIBLE', 'OUVERT', 'CURIEUX', 'ATTENTIF'],
    headline:
      "À ce moment du cycle, beaucoup de femmes retrouvent une énergie stable, encore basse, sans euphorie. La récupération est en cours.",
    observable: [
      'Une énergie qui revient, sans urgence',
      'Une humeur stable, plus disponible au dialogue',
      'Des envies qui réémergent (projets, conversations remises à plus tard)',
    ],
    propose: [
      'Reprendre les conversations qu’elle a laissées en pause',
      'Lui demander où elle en est, sans la presser',
      'Caler ensemble les engagements à venir',
    ],
    avoid: [
      'Lui imposer immédiatement un rythme intense',
      'Réveiller un conflit non résolu dès le retour de l’énergie',
      'Confondre l’énergie revenue avec une énergie pleine',
    ],
  },
  {
    id: 'pre-ovulatoire',
    name: 'Phase pré-ovulatoire',
    short: 'Pré-ovulatoire',
    parent: 'folliculaire',
    range: '2 à 3 jours avant l’ovulation',
    color: '#c2a274',
    colorSoft: '#ebdcc2',
    colorInk: '#6b5232',
    posture: ['DANS L’ACTION', 'COMPLICE', 'CONFIANT', 'JOUEUR'],
    headline:
      "À ce moment du cycle, beaucoup de femmes connaissent une montée d’énergie, d’envie d’entreprendre, et de tolérance au risque.",
    observable: [
      'Une initiative spontanée sur des sujets nouveaux',
      'Une appétence pour les projets, les sorties, les rencontres',
      'Une voix plus posée, un regard plus direct',
    ],
    propose: [
      'Lancer avec elle un projet, une sortie, un voyage court',
      'Lui laisser de l’espace pour porter ses propres élans',
      'Être présent physiquement et dans l’écoute des idées',
    ],
    avoid: [
      'Casser ses élans par excès de prudence',
      'Ramener systématiquement la conversation au quotidien',
      'Confondre son énergie avec une demande de coaching',
    ],
  },
  {
    id: 'ovulation',
    name: 'Phase ovulatoire',
    short: 'Ovulation',
    parent: 'ovulatoire',
    range: 'Fenêtre fertile, 5 jours centrés sur J(L-14)',
    color: '#b88452',
    colorSoft: '#ecd8be',
    colorInk: '#6e4524',
    posture: ['PRÉSENT', 'COMPLICE', 'COQUIN', 'RIEUR'],
    headline:
      "À ce moment du cycle, beaucoup de femmes vivent un pic de confiance, de sociabilité, et d’ouverture corporelle.",
    observable: [
      'Une sociabilité élargie, plus extravertie',
      'Une attention au corps, à l’apparence, au regard',
      'Une appétence à la séduction et au jeu',
    ],
    propose: [
      'Lui donner du temps en tête-à-tête, sans agenda',
      'Saisir les moments légers, les rires, la sensualité',
      'Lui dire ce que tu observes chez elle, sans calcul',
    ],
    avoid: [
      'Programmer mécaniquement « un moment couple »',
      'Confondre son rayonnement avec une invitation pour tous',
      'Réduire cette phase à la seule fertilité',
    ],
  },
  {
    id: 'post-ovulatoire',
    name: 'Phase post-ovulatoire',
    short: 'Post-ovulatoire',
    parent: 'lutéale',
    range: 'Plateau lutéal, après l’ovulation',
    color: '#9a8aa0',
    colorSoft: '#dfd6e2',
    colorInk: '#4d4156',
    posture: ['STABLE', 'CONCRET', 'PRÉSENT', 'NON-DISPERSÉ'],
    headline:
      "À ce moment du cycle, beaucoup de femmes connaissent un plateau stable, propice à la productivité et au recentrage.",
    observable: [
      'Une énergie soutenue mais non euphorique',
      'Une attention au cadre, au tri, à ce qui doit être fini',
      'Une diminution graduelle de l’élan social',
    ],
    propose: [
      'Avancer avec elle sur du concret : décisions, dossiers, maison',
      'Respecter ses moments de retrait sans les interpréter',
      'Tenir vos engagements, même petits',
    ],
    avoid: [
      'Lancer un projet flou ou hypothétique de plus',
      'Lui prendre du temps en surnombre pour soi',
      'Interpréter le retrait comme une mise à distance personnelle',
    ],
  },
  {
    id: 'pre-menstruelle',
    name: 'Phase pré-menstruelle',
    short: 'Pré-menstruelle',
    parent: 'lutéale',
    range: '6 derniers jours du cycle',
    color: '#7d8a9c',
    colorSoft: '#d6dde6',
    colorInk: '#3e4753',
    posture: ['PATIENT', 'ROBUSTE', 'À L’ÉCOUTE', 'NON-RÉACTIF'],
    headline:
      "À ce moment du cycle, beaucoup de femmes ont un regard plus exigeant, parfois plus sombre, et une grande créativité.",
    observable: [
      'Sa tonalité émotionnelle',
      'Sa fatigue physique',
      'Sa tolérance aux contrariétés',
    ],
    propose: [
      'Alléger la logistique sans le mettre en scène',
      'Lui donner du temps seule si elle en veut',
      'Ne pas argumenter contre les reproches frontalement — écouter, reformuler',
    ],
    avoid: [
      'Lui demander de trancher une décision lourde aujourd’hui',
      'Lui dire « c’est tes hormones »',
      'Prendre personnellement chaque remarque',
    ],
  },
];

const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p]));

// Day ranges within a 28-day reference cycle (for the hormone graph + calendar)
// These are the visual bands; the engine treats them as approximations.
const PHASE_RANGES_28 = [
  { id: 'menstruation', from: 1, to: 5 },
  { id: 'post-menstruelle', from: 6, to: 10 },
  { id: 'pre-ovulatoire', from: 11, to: 13 },
  { id: 'ovulation', from: 14, to: 16 },
  { id: 'post-ovulatoire', from: 17, to: 22 },
  { id: 'pre-menstruelle', from: 23, to: 28 },
];

function phaseForDay(day) {
  for (const r of PHASE_RANGES_28) {
    if (day >= r.from && day <= r.to) return PHASE_BY_ID[r.id];
  }
  return PHASE_BY_ID['menstruation'];
}

// Days remaining in the current sub-phase (inclusive of today).
function daysLeftInPhase(day) {
  for (const r of PHASE_RANGES_28) {
    if (day >= r.from && day <= r.to) return r.to - day + 1;
  }
  return 0;
}

function daysLeftLabel(day) {
  const n = daysLeftInPhase(day);
  if (n <= 0) return 'Bascule attendue aujourd’hui';
  if (n === 1) return 'Encore 1 jour dans cette phase';
  return `Encore ${n} jours dans cette phase`;
}

// Pastille catalogue for the journal (10–15 items, balanced).
// Brief allows the emoji exception specifically for these picto-functional pastilles.
const PASTILLES = [
  { id: 'dispute', label: 'Tension', glyph: '~' },
  { id: 'fatigue', label: 'Fatigue', glyph: '◐' },
  { id: 'repli', label: 'Repli', glyph: '◯' },
  { id: 'coquin', label: 'Coquin', glyph: '✦' },
  { id: 'tendresse', label: 'Tendresse', glyph: '♡' },
  { id: 'rires', label: 'Rires', glyph: '◡' },
  { id: 'douleur', label: 'Douleur', glyph: '×' },
  { id: 'larmes', label: 'Larmes', glyph: '◇' },
  { id: 'bon-moment', label: 'Bon moment', glyph: '◆' },
  { id: 'energie', label: 'Énergie', glyph: '↑' },
  { id: 'pulsion', label: 'Tri / ménage', glyph: '▤' },
  { id: 'soutien', label: 'Soutien donné', glyph: '⤳' },
];

// Sample echo content (previous-cycle memory)
const ECHO_SAMPLES = {
  'pre-menstruelle': {
    helpful: [
      'L’avoir laissée prendre une soirée seule (mardi)',
      'Cuisiné sans demander quoi',
    ],
    notHelpful: [
      'Avoir argumenté sur la to-do du week-end',
      'Avoir relancé la discussion sur les vacances',
    ],
    frequent: ['fatigue', 'repli', 'tendresse'],
    note: 'Le creux est tombé un soir, pas une journée. À surveiller.',
  },
  menstruation: {
    helpful: ['Bouillotte préparée avant qu’elle ne demande', 'Soirée annulée tôt'],
    notHelpful: ['Avoir voulu sortir quand même samedi'],
    frequent: ['fatigue', 'douleur', 'tendresse'],
    note: 'Trois jours décalés vs prédiction — confiance moyenne.',
  },
  'post-menstruelle': {
    helpful: ['Repris la conversation sur le déménagement', 'Petit-déj' + ' calme samedi'],
    notHelpful: ['Avoir rempli l’agenda du week-end trop tôt'],
    frequent: ['bon-moment', 'rires', 'energie'],
    note: 'Reprise plus progressive que prévu.',
  },
  'pre-ovulatoire': {
    helpful: ['Dit oui à la sortie improvisée jeudi', 'Écouté l’idée de stage long'],
    notHelpful: ['Avoir freiné le plan voyage par réflexe budgétaire'],
    frequent: ['energie', 'rires', 'bon-moment'],
    note: 'Forte initiative — j’ai eu tendance à freiner.',
  },
  ovulation: {
    helpful: ['Soirée à deux sans agenda', 'Compliment direct sur sa coiffure'],
    notHelpful: ['Avoir programmé un dîner familial dans la fenêtre'],
    frequent: ['coquin', 'rires', 'tendresse'],
    note: 'Trois jours très lumineux, le quatrième plus contenu.',
  },
  'post-ovulatoire': {
    helpful: ['Bouclé ensemble les démarches admin', 'Soirée maison samedi'],
    notHelpful: ['Avoir proposé trois sorties dans la semaine'],
    frequent: ['energie', 'bon-moment', 'pulsion'],
    note: 'Productivité haute, sociabilité décroissante.',
  },
};

Object.assign(window, { PHASES, PHASE_BY_ID, PHASE_RANGES_28, phaseForDay, daysLeftInPhase, daysLeftLabel, PASTILLES, ECHO_SAMPLES });
