const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Vérifie le JWT stocké dans le cookie httpOnly.
 * Attache req.user si valide, sinon renvoie 401.
 */
async function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
}

module.exports = authenticate;
