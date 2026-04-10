const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User       = require('../models/User');
const { addPoints } = require('../utils/points');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 jours
};

// POST /api/auth/register
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { firstName, lastName, email, password } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ firstName, lastName, email, password: hashed });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    // Connexion réussie : +0.25 pts + incrément loginCount
    user.loginCount += 1;
    await addPoints(user, 0.25);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
}

// POST /api/auth/logout
function logout(_req, res) {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true, data: null });
}

// GET /api/auth/me
function me(req, res) {
  res.json({ success: true, data: req.user });
}

module.exports = { register, login, logout, me };
