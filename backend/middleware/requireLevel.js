const LEVELS = ['débutant', 'intermédiaire', 'avancé', 'expert'];

/**
 * Middleware de contrôle d'accès par niveau.
 * Utiliser après authenticate().
 *
 * @param {string} minLevel - Niveau minimum requis
 */
function requireLevel(minLevel) {
  return (req, res, next) => {
    const userIndex = LEVELS.indexOf(req.user?.level);
    const minIndex  = LEVELS.indexOf(minLevel);

    if (userIndex === -1 || minIndex === -1) {
      return res.status(403).json({ success: false, message: 'Niveau inconnu' });
    }

    if (userIndex < minIndex) {
      return res.status(403).json({
        success: false,
        message: `Accès réservé aux utilisateurs de niveau ${minLevel} minimum`,
      });
    }

    next();
  };
}

module.exports = requireLevel;
