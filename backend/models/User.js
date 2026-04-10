const mongoose = require('mongoose');

const LEVELS = ['débutant', 'intermédiaire', 'avancé', 'expert'];

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    level:     { type: String, enum: LEVELS, default: 'débutant' },
    points:    { type: Number, default: 0 },
    loginCount:  { type: Number, default: 0 },
    actionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ne jamais retourner le mot de passe dans les réponses JSON
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
