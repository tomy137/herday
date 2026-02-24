# Moteur d'Inference HerDay

> Ce document decrit en langage humain la logique du moteur d'inference de HerDay.
> Il est destine aux contributeurs, utilisateurs curieux et non-developpeurs.
> Le code source correspondant se trouve dans `backend/app/services/cycle_engine.py`.

---

## 1. Glossaire

| Terme | Definition |
|---|---|
| **Cycle menstruel** | Periode allant du premier jour des regles au jour precedant les regles suivantes. Dure en moyenne 28 jours, mais varie entre 21 et 35 jours selon les femmes. |
| **Menstruation** | Phase de saignement (les "regles"). Dure generalement 3 a 7 jours. |
| **Phase folliculaire** | Phase apres les regles ou le corps se prepare a l'ovulation. Les oestrogenes augmentent, l'energie revient progressivement. |
| **Ovulation** | Liberation d'un ovule par l'ovaire. Se produit generalement autour du jour 14 d'un cycle de 28 jours. Fenetre de fertilite maximale. |
| **Phase luteale** | Phase apres l'ovulation. La progesterone augmente puis diminue. Dure environ 14 jours (relativement constante). C'est pendant cette phase que le SPM peut apparaitre. |
| **SPM** | Syndrome premenstruel. Ensemble de symptomes (irritabilite, fatigue, sensibilite) qui peuvent apparaitre dans les jours precedant les regles. |
| **Methode Ogino** | Methode de calcul basee sur le calendrier. Principe : la phase luteale dure toujours environ 14 jours. Donc l'ovulation se situe a `longueur_du_cycle - 14` jours. |

---

## 2. Comment le moteur calcule les phases

### Regle de base

Le moteur utilise la **methode Ogino** comme fondation :

```
Jour d'ovulation = Longueur du cycle - 14 jours
```

Par exemple, pour un cycle de 28 jours : ovulation au jour 14.
Pour un cycle de 32 jours : ovulation au jour 18.

### Decoupage en phases

Pour un cycle donne, les phases sont decoupees ainsi :

| Phase | Jours (cycle 28j, regles 5j) | Description |
|---|---|---|
| **Menstruation** | Jour 1 a 5 | Du debut des regles a la fin des saignements |
| **Folliculaire** | Jour 6 a 11 | Apres les regles, avant la fenetre d'ovulation |
| **Ovulation** | Jour 12 a 16 | Fenetre de 4 jours autour du jour d'ovulation estime |
| **Luteale** | Jour 17 a 28 | Apres l'ovulation jusqu'aux prochaines regles |

### Quand la longueur du cycle est inconnue

Si l'app n'a pas encore assez de donnees, elle utilise les valeurs par defaut :
- **Longueur du cycle** : 28 jours
- **Duree des regles** : 5 jours
- **Phase luteale** : 14 jours (constante Ogino)

Ces valeurs sont remplacees par les moyennes reelles de l'utilisatrice des que suffisamment de cycles sont enregistres.

---

## 3. Comment les evenements alimentent le moteur

### Principe

L'utilisateur ne remplit pas de formulaire. Il signale des **evenements** au fil de l'eau. Le moteur reconstruit les cycles a partir de ces signaux.

### Tableau des evenements et leurs effets

| Evenement | Poids | Effet sur le moteur |
|---|---|---|
| `period_started` | **Fort** | Cree un nouveau cycle confirme. Ferme le cycle precedent. C'est l'ancre principale. |
| `period_ended` | **Fort** | Calcule la duree des regles (date fin - date debut + 1). |
| `period_predicted` | **Fort** | Cree un cycle "infere" avec une confiance reduite de moitie. Utile quand la compagne donne une date approximative. |
| `period_late` | **Moyen** | Indique que le cycle est plus long que prevu. Ajuste la confiance. |
| `mood_irritable` | **Faible** | Signal de SPM possible (phase luteale tardive). Ne modifie pas les cycles directement. |
| `mood_tired` | **Faible** | Signal de menstruation ou de phase luteale. |
| `mood_energetic` | **Faible** | Signal de phase folliculaire ou d'ovulation. |
| `mood_emotional` | **Faible** | Signal de phase luteale. |

### Exemple concret

**Scenario** : L'utilisateur signale `period_started` le 1er mars.

1. Le moteur cree un nouveau cycle confirme avec `start_date = 1er mars`
2. Si un cycle precedent existait, il est ferme : `end_date = 28 fevrier`, et sa longueur est calculee
3. Le moteur calcule la duree moyenne des cycles connus
4. La phase actuelle est recalculee pour le tableau de bord
5. Le calendrier est mis a jour avec les nouvelles predictions

**Scenario** : 28 jours plus tard, l'utilisateur signale un nouveau `period_started` le 29 mars.

1. Le cycle du 1er mars est ferme : longueur = 28 jours
2. Un nouveau cycle confirme commence le 29 mars
3. Le systeme passe en etat `LEARNING` (2 cycles confirmes)
4. Les predictions utilisent maintenant la longueur moyenne reelle (28j)

### Cascade de recalcul

```
Nouvel evenement signale
    |
    v
Recalcul de TOUS les cycles (depuis le debut)
    |
    v
Mise a jour de l'etat du systeme (UNKNOWN -> CONFIDENT)
    |
    v
Recalcul des phases (aujourd'hui et calendrier)
    |
    v
Mise a jour du tableau de bord
```

Le recalcul complet garantit la coherence : si l'utilisateur corrige une date passee, tout est recalcule.

---

## 4. Comment la confiance evolue

### Etats du systeme

Le moteur connait 5 niveaux de confiance :

| Etat | Condition | Score | Ce que voit l'utilisateur |
|---|---|---|---|
| **UNKNOWN** | Aucun evenement | 0.0 | "Signalez ce que vous observez" |
| **ESTIMATING** | Signaux faibles uniquement | 0.2 | "Estimation tres approximative" |
| **PARTIAL** | 1 cycle confirme | 0.4 | "Prediction basique" |
| **LEARNING** | 2 cycles confirmes | 0.7 | "Prediction en amelioration" |
| **CONFIDENT** | 3+ cycles confirmes | 0.9 | "Prediction fiable" |

### Comment la confiance est calculee

La confiance depend de :
1. **Nombre de cycles confirmes** : plus il y en a, mieux c'est
2. **Source des cycles** : un cycle "confirme" (via `period_started`) vaut plus qu'un cycle "infere"
3. **Regularite** : si les cycles ont des longueurs similaires, la confiance augmente

### Exemples

- **Marie vient d'installer l'app** : 0 evenement → UNKNOWN (confiance 0.0). L'app affiche du contenu educatif et des boutons d'action.

- **1 semaine plus tard**, il signale "Elle a ses regles" → 1 cycle confirme → PARTIAL (confiance 0.4). L'app predit la prochaine date en utilisant un cycle de 28 jours par defaut.

- **1 mois plus tard**, il signale a nouveau "Elle a ses regles" → 2 cycles confirmes → LEARNING (confiance 0.7). L'app connait maintenant la vraie longueur du cycle.

- **Encore 1 mois plus tard**, troisieme signalement → 3 cycles → CONFIDENT (confiance 0.9). Les predictions sont fiables et le calendrier est colore avec assurance.

---

## 5. Limites connues

### Ce que l'app NE fait PAS

- **L'app ne remplace pas un suivi medical.** Elle ne donne pas de diagnostic et ne doit pas etre utilisee comme methode de contraception.
- **Les evenements d'humeur sont des indicateurs faibles.** Ils ne determinent jamais a eux seuls la phase du cycle. Ils servent a affiner la confiance, pas a ancrer des dates.
- **Les cycles irreguliers reduisent la confiance.** Si les cycles varient beaucoup en longueur, le moteur le detecte et baisse son score de confiance.
- **La precision augmente avec le temps.** L'app fonctionne mieux apres 2-3 cycles confirmes. Les premieres predictions sont approximatives.

### Cas particuliers

- **Cycle tres court (<21j) ou tres long (>35j)** : le moteur fonctionne mais la confiance est reduite car ces cycles sont plus difficiles a predire.
- **Arret prolonge** : si l'utilisateur ne signale plus rien pendant plusieurs mois, le moteur continue a predire mais la confiance diminue progressivement.
- **Contraception hormonale** : l'app peut quand meme etre utilisee pour suivre les saignements de retrait, mais les predictions de phase sont moins pertinentes.
