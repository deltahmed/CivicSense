const LEVELS = ['débutant', 'intermédiaire', 'avancé', 'expert'];

const THRESHOLDS = {
  débutant:       0,
  intermédiaire: 10,
  avancé:        25,
  expert:        50,
};

/**
 * Calcule le niveau en fonction du total de points.
 * @param {number} points
 * @returns {string} level
 */
function computeLevel(points) {
  let level = 'débutant';
  for (const [lvl, threshold] of Object.entries(THRESHOLDS)) {
    if (points >= threshold) level = lvl;
  }
  return level;
}

/**
 * Ajoute des points à un utilisateur et recalcule son niveau.
 * @param {import('mongoose').Document} user - document Mongoose User
 * @param {number} amount - points à ajouter
 */
async function addPoints(user, amount) {
  user.points      += amount;
  user.actionCount += 1;
  user.level        = computeLevel(user.points);
  await user.save();
}

module.exports = { addPoints, computeLevel };
