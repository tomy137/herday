# Handoff : HerDay V2 — Refonte de l'app

## Vue d'ensemble

HerDay est une application mobile (iOS d'abord) destinée au **partenaire d'une femme qui a un cycle menstruel**. Elle traduit la position du cycle en une **posture relationnelle à adopter au quotidien** (« Elle a besoin que tu sois : SOLIDE · FIABLE · DISCRET… »), appuyée sur un vocabulaire clinique sobre, une mémoire inter-cycles (« échos »), et un journal d'observation rapide.

Ce bundle documente la refonte V2 : onboarding, écran d'accueil, journal, échos, calendrier, réglages, feuille de correction, et widgets iOS.

> ⚠️ Sujet sensible. Le ton est **clinique, hypothétique, sans jugement sur elle, masculin sans être macho**. Toute la copy suit cette règle (« beaucoup de femmes ressentent… », jamais « elle est… »). À préserver impérativement à l'implémentation.

## À propos des fichiers de design

Les fichiers de `source/` sont des **références de design réalisées en HTML/React via Babel-in-browser** — des prototypes qui montrent l'apparence et le comportement voulus, **pas du code de production à copier tel quel**.

La tâche est de **recréer ces designs dans l'environnement cible** (par ex. React Native / SwiftUI pour une app iOS) en suivant les patterns établis de ce codebase. Si aucun environnement n'existe encore, choisir le framework le plus adapté (app mobile native → **SwiftUI** ou **React Native**) et y implémenter les écrans.

Ce qui est réutilisable presque tel quel :
- `phase-data.jsx` — **toute la donnée de contenu** (les 6 sous-phases, leurs textes, postures, échos, pastilles). C'est la source de vérité du contenu, à porter dans le modèle de données.
- Les tokens de design dans `system.jsx` (objet `TOKENS`).

Ce qui est purement harnais de présentation (à **ignorer** côté produit) :
- `design-canvas.jsx` — la grille de présentation pan/zoom qui affiche tous les artboards côte à côte.
- `tweaks-panel.jsx` — le panneau de réglages de la maquette (sélecteur de phase pour la démo).
- `app.jsx` — n'organise que la mise en page des artboards dans le canvas de présentation.

## Fidélité

**Haute fidélité (hifi).** Couleurs, typographie, espacements et interactions sont définitifs. Recréer l'UI au pixel près en utilisant les composants/librairies du codebase cible. Les valeurs exactes sont dans la section *Design Tokens*.

---

## Architecture & modèle conceptuel

### Les deux niveaux de phase

L'app raisonne à deux niveaux (voir `phase-data.jsx`) :

1. **6 sous-phases** (unité d'affichage) — `PHASES[]`
2. **4 phases principales** (regroupement « en coulisse », champ `parent`) — utilisées pour la mémoire inter-cycles (les échos). **Non affichées dans l'UI.**

| # | id | name | short | parent | range (affiché) | bande J (cycle 28j) |
|---|----|------|-------|--------|-----------------|---------------------|
| 1 | `menstruation` | Phase menstruelle | Menstruation | menstruelle | Jours 1 à 5 | J1–5 |
| 2 | `post-menstruelle` | Phase post-menstruelle | Post-menstruelle | folliculaire | Quelques jours après les règles | J6–10 |
| 3 | `pre-ovulatoire` | Phase pré-ovulatoire | Pré-ovulatoire | folliculaire | 2 à 3 jours avant l'ovulation | J11–13 |
| 4 | `ovulation` | Phase ovulatoire | Ovulation | ovulatoire | Fenêtre fertile, 5 j centrés sur J(L-14) | J14–16 |
| 5 | `post-ovulatoire` | Phase post-ovulatoire | Post-ovulatoire | lutéale | Plateau lutéal, après l'ovulation | J17–22 |
| 6 | `pre-menstruelle` | Phase pré-menstruelle | Pré-menstruelle | lutéale | 6 derniers jours du cycle | J23–28 |

> Note clinique : ce modèle sort volontairement la menstruation comme phase principale à part. En littérature médicale stricte, la phase folliculaire commence à J1 et englobe les règles.

### Forme de chaque objet phase (`phase-data.jsx`)

```js
{
  id, name, short, parent, range,
  color,      // teinte forte de la phase (puce, accent)
  colorSoft,  // fond pâle de la phase (cartes, bandes)
  colorInk,   // texte foncé lisible sur colorSoft
  posture: ['SOLIDE','FIABLE','DISCRET','LOGISTIQUE'], // 3–5 mots, l'élément central de l'app
  headline,   // 1 phrase clinique hypothétique
  observable: [...], // « Ce que tu peux observer »
  propose: [...],    // « Ce que tu peux proposer »
  avoid: [...],      // « Il vaut mieux éviter »
}
```

### Fonctions dérivées (déterministes, sans IA)
- `phaseForDay(day)` → renvoie la sous-phase d'un jour du cycle.
- `daysLeftInPhase(day)` → jours restants dans la sous-phase courante (inclusif).
- `daysLeftLabel(day)` → libellé prêt à afficher (« Encore 3 jours dans cette phase »).

### Couleurs par phase (hex exacts)

| phase | color | colorSoft | colorInk |
|-------|-------|-----------|----------|
| menstruation | `#9c6a5c` | `#e9d9d3` | `#5a3a32` |
| post-menstruelle | `#8a9a82` | `#dfe5d8` | `#3f4a3a` |
| pre-ovulatoire | `#c2a274` | `#ebdcc2` | `#6b5232` |
| ovulation | `#b88452` | `#ecd8be` | `#6e4524` |
| post-ovulatoire | `#9a8aa0` | `#dfd6e2` | `#4d4156` |
| pre-menstruelle | `#7d8a9c` | `#d6dde6` | `#3e4753` |

---

## Design Tokens

Source : objet `TOKENS` + bloc CSS `:root` dans `source/system.jsx`.

### Couleurs (surfaces & encre — palette « papier crème chaud »)
| token | hex | usage |
|-------|-----|-------|
| `--paper` | `#f7ecd0` | fond principal (papier) |
| `--paper-warm` | `#efe1be` | cartes plates, fonds secondaires |
| `--paper-deep` | `#e6d4a8` | surface la plus profonde |
| `--ink` | `#2b2618` | texte principal, boutons pleins |
| `--ink-soft` | `#46402f` | texte secondaire, hover bouton |
| `--ink-mute` | `#7a715c` | texte tertiaire, labels |
| `--ink-faint` | `#a8a08c` | texte le plus discret, séparateurs mono |
| `--rule` | `#d8c79c` | bordures, filets (0.5px) |
| `--rule-soft` | `#e3d3ab` | filets plus légers |
| `--accent` | `#a25a3c` | terracotta — usage **rare** (« n'a pas aidé », alertes) |
| `--accent-soft` | `#e8d8cd` | fond accent pâle |
| `--green` | `#5e7a5a` | positif (« a aidé ») |
| `#f1e9d8` | — | fond du `<body>` (hors app, cadre du canvas) |

### Typographie (3 familles, Google Fonts)
| token | stack | usage |
|-------|-------|-------|
| `--f-serif` | `"Newsreader", "Source Serif Pro", Georgia, serif` | titres, mots de posture, citations (souvent italique) |
| `--f-sans` | `"Mulish", -apple-system, "Helvetica Neue", sans-serif` | corps, UI, boutons |
| `--f-mono` | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace` | labels capitales, dates, métadonnées |

Import : `Newsreader` (400/500, italique 400, optical 6–72), `Mulish` (300–700 + italiques), `JetBrains Mono` (400/500). Feature : `font-feature-settings: "ss01"` sur `.hd`.

**Échelle typographique observée** (px) : posture 28 · titre phase (h2) 22 · titres carte (serif) 16 · corps 14–15 · secondaire 13–13.5 · labels caps 11 (letter-spacing 0.12em) · mono méta 9–10 (letter-spacing 0.04–0.08em).

### Rayons, filets, ombres
- Border-radius : cartes **14px**, boutons **10px**, pastilles **999px** (pill), petits filets de progression **1px**.
- Bordures : **0.5px** `var(--rule)` partout (filets fins, esthétique « éditoriale »).
- Pas d'ombres portées marquées — le design repose sur les filets fins et les contrastes de surface, pas sur l'élévation.

### Espacement
- Padding écran horizontal : **22px**.
- Padding carte : **18px** (20px sur la PhaseCard).
- Gap vertical entre blocs de la home : **18px**.
- Nav basse : padding `10px 12px 24px`, grille 4 colonnes, gap 4px.

---

## Composants primitifs (`system.jsx`)

| Classe / composant | Description |
|--------------------|-------------|
| `.hd-card` | carte papier, bordure 0.5px, radius 14, padding 18 |
| `.hd-card-flat` | carte sans bordure, fond `--paper-warm` |
| `.hd-btn` | bouton plein encre, radius 10, padding `14px 20px`, hover `--ink-soft`, active scale .99 |
| `.hd-btn-ghost` | variante bordée transparente |
| `.hd-btn-text` | variante texte discrète |
| `.hd-pastille` | pill sélectionnable (journal). `data-selected="true"` → fond encre, texte papier |
| `.hd-input` | champ souligné (border-bottom 0.5px → encre au focus) |
| `.hd-textarea` | zone de texte, fond `--paper-warm`, radius 10 |
| `.hd-tag` / `PhaseTag` | étiquette mono + puce couleur de phase |
| `.hd-posture-rail` / `PostureRail` | **moment de design central** : mots de posture en serif 28px capitales, séparés par des points médians `--ink-faint` |
| `Confidence` | indicateur de score de confiance (niveau + valeur /4) |
| `Accordion` | section dépliable (« Ce que tu peux observer/proposer/éviter ») |
| `NavBar` | barre d'onglets basse (Accueil · Journal · Échos · Calendrier… sticky, blur) |
| `StatusBar` / `Topbar` | sliver de status iOS + en-tête avec wordmark `HerDay` (serif 19px, exposant mono) |

Catalogue de pastilles du journal (`PASTILLES` dans `phase-data.jsx`) : 12 items `{id, label, glyph}`. Les glyphes sont des **caractères typographiques** (`~ ◐ ◯ ✦ ♡ ◡ × ◇ ◆ ↑ ▤ ⤳`), pas des emojis — à conserver ou remplacer par des icônes équivalentes du système cible.

---

## Écrans / Vues

### Onboarding — 4 écrans (`screens-onboarding.jsx`)
Composant `Onboarding` (state `step` 0→3, `total = 4`). Chaque écran via `OnbStep` (eyebrow mono, titre serif, contenu, CTA plein + bouton retour).

1. **01 · Connexion** (`OnbConnexion`) — entrée dans l'app.
2. **02 · Pacte de transparence** (`OnbPacte`) — engage l'utilisateur à parler de l'app à sa compagne. Deux choix : « Je lui en parle bientôt » / « Je lui en ai déjà parlé ».
3. **03 · Cycle et hormones** (`OnbCycle`) — explication clinique brève + **graphique des hormones** (`HormoneGraph`, voir `hormone-graph.jsx`) + légende des 6 sous-phases avec puces couleur et `range`.
4. **04 · Première saisie** (`OnbFirstEntry`) — date approximative des dernières règles + longueur de cycle (facultative). Rappel : score de confiance bas tant qu'incertain, « c'est sain ».

> ℹ️ Un 5ᵉ écran « Mille-feuille » a été **retiré** de cette version (et le bandeau associé sur la home). Si vous voyez des références au « mille-feuille » dans d'anciennes notes, l'ignorer.

### Accueil / Home (`screens-home.jsx` → `HomeScreen`)
Écran scrollable. De haut en bas, blocs espacés de 18px, padding latéral 22px :
1. `StatusBar` + `Topbar` (date du jour à droite, en mono : « JEU 28 MAI »).
2. **`PhaseCard`** — carte sur fond `phase.colorSoft + '70'`. Contient : `PhaseTag` (puce + « J{n} »), titre `phase.name` + `range` en serif italique mute, `headline`, `Confidence` (niveau « élevée », 4/4), **`PhaseProgress`** (segments 14×4px, remplis = jours écoulés dans la sous-phase) + label « Encore N jours… » en mono, filet, label caps « Elle a besoin que tu sois : », **`PostureRail`** (les mots-clés), et CTA texte « → je l'observe différemment » (ouvre la feuille de correction).
3. **Graphique hormonal** (`HormoneGraph`, height 190) sur fond `--paper-warm`, radius 14.
4. **`EchoCard`** — « Écho · cycle précédent ». Rappelle « À la même phase il y a un mois, tu avais noté : » avec une ligne « A aidé » (vert) et une « N'a pas aidé » (accent). Lien « Voir tous les échos → ».
5. **`JournalQuick`** — « Ton observation du jour » (10–30 s) : pastilles toggleables (`PASTILLES`), textarea libre, deux champs « A aidé » (vert) / « N'a pas aidé » (accent).
6. **`GoFurther`** — 3 accordéons : observer / proposer / éviter (alimentés par `phase.observable/propose/avoid`).
7. `NavBar` (onglet « home » actif).

### Journal (plein écran) (`screens-other.jsx` → `JournalScreen`)
Version étendue de la saisie d'observation (pastilles + texte + a aidé / n'a pas aidé), avec en-tête de phase et retour.

### Échos (`EchoesScreen`)
Mémoire inter-cycles agrégée à la **phase principale**. Contient un historique de la même phase sur plusieurs mois (`samePhaseHistory` : Avril / Mars / Février avec plages J et notes), des lignes « a aidé / n'a pas aidé », et **`FrequencyRow`** — pastilles « moments forts » les plus fréquentes à cette phase (barre de fréquence count/total). Source : `ECHO_SAMPLES[phase.id]`.

### Calendrier (`CalendarScreen`)
Grille mensuelle (« Mai 2026 »), chaque jour teinté par `phase.colorSoft` (jour courant souligné d'un trait encre). **Légende des phases** en grille 2 colonnes (puce `colorSoft` + `short`). Lien « Voir toutes les phases {phase} des 6 derniers mois → ».

### Réglages — pacte de transparence (`SettingsScreen`)
Groupes de réglages (`SettingsGroup` avec statut, `SettingsRow` label/valeur/hint). Met en avant le **statut de transparence** (`transparencyStatus`, ex. `told_soon`).

### Feuille « Je l'observe différemment » (`OverrideSheet`)
Bottom sheet omniprésente sur la home. Permet à l'utilisateur de **corriger manuellement** la sous-phase estimée. Vocabulaire **hypothétique**, choix journalisé. Liste les 6 sous-phases sélectionnables (puce couleur + `short`), la phase courante mise en évidence.

### Widgets iOS (`widgets.jsx`)
Disponibilité passive, **aucune notification ni rappel intrusif**. La phase rendue suit la donnée courante. Variantes :
- **Lock screen** : inline, circulaire (progression dans la sous-phase, `phaseDayIdx/phaseSpan`), rectangulaire.
- **Home screen** : small posture (mots-clés sur fond `colorSoft`), small jour-du-cycle (anneau de progression + ticks par jour), medium « aujourd'hui » (phase + posture + jours restants), large « tableau complet » (phase + posture + écho).
- Toutes les tailles ont un `WidgetHeader` (puce couleur + wordmark mono « HerDay »).

---

## Interactions & comportement

- **Navigation** : `Prototype` (`prototype.jsx`) tient l'état `screen` (`home` / `journal` / `echoes` / `calendar` / `settings` / `onboarding`) et `phaseId`. `NavBar` change d'écran ; `onOverride` ouvre `OverrideSheet`.
- **Override** : choisir une sous-phase ferme la feuille et remplace la phase courante (le choix doit être journalisé / horodaté côté prod).
- **Journal** : pastilles en toggle (multi-sélection), persistance attendue par jour.
- **PhaseProgress / anneaux widget** : remplissage = `(jour − range.from + 1) / (range.to − range.from + 1)`.
- **Transitions** : sobres. `color .15s` sur les états interactifs, `transform scale(.99)` à l'`:active` des boutons, `background .15s`. Pas d'animations spectaculaires.
- **États** : `data-active` sur la nav, `data-selected` sur les pastilles, `:focus` passe les bordures de champ à `--ink`.

## Gestion d'état (à porter)
- `screen` (vue courante), `phaseId` (sous-phase active, dérivable d'une date de dernières règles + longueur de cycle), `journal` (`{ pastilles[], freeText, helpful, notHelpful }`), `overrideOpen`, `transparencyStatus`.
- Données dérivées par calcul déterministe (`phaseForDay`, `daysLeftInPhase`) — **pas d'IA**.
- Les « échos » s'agrègent par **phase principale** (les 4 parents), sur un historique de quelques mois.

## Assets
- **Aucune image bitmap.** Tout est typographique / CSS / SVG inline (le graphique hormonal est un SVG calculé dans `hormone-graph.jsx`).
- **Polices** : Newsreader, Mulish, JetBrains Mono (Google Fonts) — utiliser les équivalents système ou embarquer les fichiers côté app native.
- **Glyphes de pastilles** : caractères Unicode (voir liste plus haut), à remplacer par les icônes du système cible si besoin.

## Fichiers de référence (dans `source/`)
| fichier | rôle | à porter ? |
|---------|------|-----------|
| `HerDay V2.html` | point d'entrée, ordre de chargement, imports de polices | référence |
| `phase-data.jsx` | **contenu + modèle de données** (phases, pastilles, échos) | **oui, source de vérité** |
| `system.jsx` | tokens de design + primitives UI + CSS de base | **oui (tokens + composants)** |
| `hormone-graph.jsx` | graphique hormonal SVG | oui |
| `screens-onboarding.jsx` | les 4 écrans d'onboarding | oui |
| `screens-home.jsx` | écran d'accueil + sous-composants | oui |
| `screens-other.jsx` | journal, échos, calendrier, réglages, override sheet | oui |
| `prototype.jsx` | wiring de navigation entre écrans | oui (logique) |
| `widgets.jsx` | widgets iOS (lock + home screen) | oui |
| `app.jsx` | mise en page du **canvas de présentation** | non (harnais) |
| `design-canvas.jsx` | grille pan/zoom de la maquette | non (harnais) |
| `tweaks-panel.jsx` | panneau de réglages de la démo | non (harnais) |

## Lancer la maquette de référence
Ouvrir `source/HerDay V2.html` dans un navigateur (connexion requise pour React/Babel/polices via CDN). La maquette s'affiche dans un canvas pan/zoom regroupant tous les écrans par section ; le panneau Tweaks (en bas à droite) permet de changer la sous-phase pour voir chaque état.
