require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// --- Sécurité HTTP ---
app.use(helmet());

// --- CORS (frontend uniquement) ---
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// --- Cookies & JSON ---
app.use(cookieParser());
app.use(express.json());

// --- Routes ---
// app.use('/api/auth',    require('./routes/auth'));
// app.use('/api/users',   require('./routes/users'));
// app.use('/api/objects', require('./routes/objects'));

// --- Route de santé ---
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// --- Gestion des erreurs globales ---
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
});

// --- Connexion MongoDB + démarrage ---
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connecté');
    app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
  })
  .catch((err) => {
    console.error('Erreur de connexion MongoDB :', err.message);
    process.exit(1);
  });
