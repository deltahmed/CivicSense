# 📦 Dépendances Frontend - Installation Complète

Documentation des librairies installées et comment les utiliser.

---

## 📥 Dépendances Installées

```bash
✅ sonner@^2.0.7           → Notifications élégantes
✅ react-hook-form@^7.74   → Gestion forms optimisée
✅ zod@^4.3.6              → Validation TypeScript
✅ lucide-react@^1.14.0    → Icônes modernes
✅ date-fns@^4.1.0         → Manipulation dates
✅ framer-motion@^12.38.0  → Animations fluides
```

---

## 🔔 SONNER - Notifications

Notifications élégantes et performantes.

### Setup (DÉJÀ FAIT)

```jsx
// main.jsx
import { NotificationProvider } from './context/NotificationContext'

<NotificationProvider>
  <App />
</NotificationProvider>
```

### Utilisation

```jsx
import { useNotification } from '../context/NotificationContext'

export default function MyComponent() {
  const { notify } = useNotification()

  return (
    <button onClick={() => notify.success('Bravo!')}>
      Valider
    </button>
  )
}
```

### Types de notifications

```jsx
notify.success('Opération réussie')    // Vert
notify.error('Une erreur s\'est produite')    // Rouge
notify.warning('Attention!')           // Jaune
notify.info('Information')             // Bleu
notify.loading('Chargement...')        // Neutral
```

### Positions et options

```jsx
// Dans NotificationContext.jsx, tu peux modifier:
<Toaster 
  position="top-right"      // top-left, top-center, bottom-left, etc.
  richColors                // Couleurs par type
  closeButton               // Bouton fermeture visible
  expand={false}            // Expanded/compact
/>
```

---

## 📝 REACT-HOOK-FORM + ZOD - Formulaires avancés

Gestion de formulaires performante + validation TypeScript-safe.

### Exemple complet (voir LoginForm.jsx)

```jsx
import { useForm } from 'react-hook-form'
import { zodResolver } from 'zod/dist/lodashEs'
import { z } from 'zod'

// 1. Définir le schéma Zod
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Min 8 caractères'),
  confirmPassword: z.string(),
  age: z.number().min(18, 'Minimum 18 ans'),
  genre: z.enum(['M', 'F', 'Autre']),
  acceptTerms: z.boolean().refine(v => v, 'Vous devez accepter les conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

// 2. Utiliser le formulaire
export default function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange', // Validation en temps réel
  })

  async function onSubmit(data: RegisterFormData) {
    console.log(data) // ✅ TypeScript-safe
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Email */}
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}

      {/* Password */}
      <input type="password" {...register('password')} />
      {errors.password && <p>{errors.password.message}</p>}

      {/* Age */}
      <input type="number" {...register('age', { valueAsNumber: true })} />
      {errors.age && <p>{errors.age.message}</p>}

      {/* Genre */}
      <select {...register('genre')}>
        <option value="">Select</option>
        <option value="M">Homme</option>
        <option value="F">Femme</option>
        <option value="Autre">Autre</option>
      </select>

      {/* Accept Terms */}
      <label>
        <input type="checkbox" {...register('acceptTerms')} />
        J'accepte les conditions
      </label>
      {errors.acceptTerms && <p>{errors.acceptTerms.message}</p>}

      <button type="submit">S'inscrire</button>
    </form>
  )
}
```

### Validation modes

```jsx
{
  resolver: zodResolver(schema),
  mode: 'onBlur',      // Validation on input blur (default)
  mode: 'onChange',    // Real-time validation
  mode: 'onSubmit',    // Validation only on submit
  mode: 'onTouched',   // After user interacts
}
```

### Schémas Zod courants

```jsx
// String validations
z.string().email()
z.string().url()
z.string().min(5).max(100)
z.string().regex(/^[a-z]+$/)

// Number validations
z.number().min(0).max(100)
z.number().int()
z.number().positive()

// Array validations
z.array(z.string()).min(1)

// Enum
z.enum(['admin', 'user', 'moderator'])

// Optional / Nullable
z.string().optional()
z.string().nullable()

// Custom validation
z.string().refine(val => val.startsWith('admin_'), 'Doit commencer par admin_')
```

---

## 🎨 LUCIDE-REACT - Icônes modernes

2000+ icônes SVG élégantes et cohérentes.

### Utilisation

```jsx
import { Mail, Lock, Heart, Settings, Trash2, Copy, ExternalLink } from 'lucide-react'

export function MyComponent() {
  return (
    <div className="flex gap-4">
      <Mail size={24} />
      <Lock size={24} />
      <Heart size={24} className="text-red-500" />
      <Settings size={24} className="animate-spin" />
      <Trash2 size={24} className="hover:text-red-600" />
    </div>
  )
}
```

### Props

```jsx
<Mail 
  size={24}           // Taille (par défaut 24)
  color="blue"        // Couleur
  strokeWidth={2}     // Épaisseur contour
  className="..."     // Classes Tailwind
/>
```

### Icônes courantes

```jsx
// Navigation
Menu, Home, ChevronRight, ArrowLeft, Navigation

// Actions
Search, Download, Upload, Copy, Trash2, Edit, Plus, X

// Status
CheckCircle, AlertCircle, Info, HelpCircle, Clock

// User
User, LogOut, Settings, Bell, Mail

// Objects
Lightbulb, Thermometer, Camera, Zap, Eye

// Other
Star, Heart, Share2, External Link, MoreVertical
```

**Liste complète** : https://lucide.dev

---

## 📅 DATE-FNS - Manipulation de dates

Librairie légère pour formatter et manipuler les dates.

### Utilisation

```jsx
import { format, differenceInDays, addDays, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

// Formatter une date
const date = new Date('2025-04-29')
format(date, 'dd/MM/yyyy')        // "29/04/2025"
format(date, 'PPP', { locale: fr }) // "29 avril 2025"
format(date, 'HH:mm:ss')          // "14:30:45"

// Différences
differenceInDays(new Date(), date) // Nombre de jours écoulés

// Manipulations
addDays(date, 5)                  // Date + 5 jours
startOfDay(date)                  // 00:00:00

// Comparaisons
isAfter(date1, date2)
isBefore(date1, date2)
isToday(date)
```

### Formats courants

```jsx
// Dates
'dd/MM/yyyy'     → "29/04/2025"
'yyyy-MM-dd'     → "2025-04-29"
'MMM dd'         → "Apr 29"
'EEEE dd MMMM'   → "Tuesday 29 April"

// Times
'HH:mm'          → "14:30"
'HH:mm:ss'       → "14:30:45"

// Combined
'PPpp'           → "Apr 29, 2025, 2:30 PM"
'PPPppp'         → "April 29, 2025, 2:30:45 PM"
```

### Exemple tableau dernières alertes

```jsx
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function AlertsList({ alerts }) {
  return (
    <table>
      <tbody>
        {alerts.map(alert => (
          <tr key={alert.id}>
            <td>{alert.message}</td>
            <td>
              {format(parseISO(alert.created_at), 'PPp', { locale: fr })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 🎬 FRAMER-MOTION - Animations fluides

Animations fluides et performantes pour React.

### Setup basique

```jsx
import { motion } from 'framer-motion'

// Animation simple on hover
<motion.div
  whileHover={{ scale: 1.05 }}
  transition={{ duration: 0.3 }}
>
  Hover me
</motion.div>

// Animation au montage
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Fade in
</motion.div>
```

### Exemples courants

```jsx
// Button avec animation
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="bg-blue-600 text-white px-4 py-2 rounded"
>
  Click me
</motion.button>

// Card apparition
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.5, delay: 0.2 }}
  className="bg-white p-6 rounded shadow"
>
  Content
</motion.div>

// Spinner loading
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
/>

// List animation
<motion.ul layout>
  {items.map((item, i) => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: i * 0.1 }}
    >
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### Propriétés d'animation

```jsx
// Transforms
whileHover={{ scale: 1.1 }}         // Zoom
whileHover={{ x: 10, y: 5 }}        // Position
whileHover={{ rotate: 45 }}         // Rotation
whileHover={{ skewY: 10 }}          // Skew
whileHover={{ opacity: 0.5 }}       // Opacité

// Interactions
whileTap={{ scale: 0.95 }}          // On click
whileInView={{ opacity: 1 }}        // On scroll into view
whileFocus={{ outline: '2px solid blue' }}

// Transitions
transition={{ duration: 0.3 }}                           // Durée
transition={{ delay: 0.5 }}                             // Délai
transition={{ ease: 'easeInOut' }}                      // Easing
transition={{ repeat: Infinity }}                       // Répéter infiniment
transition={{ type: 'spring', stiffness: 100 }}        // Spring animation
```

---

## 🔗 Intégration Complète Exemple

### Formulaire ProfileUpdate avec tous les outils

```jsx
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from 'zod/dist/lodashEs'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { User, Mail, Calendar, Save, AlertCircle } from 'lucide-react'
import Button from './Button'
import Input from './Input'
import { useNotification } from '../context/NotificationContext'

const profileSchema = z.object({
  pseudo: z.string().min(3, 'Min 3 caractères'),
  email: z.string().email('Email invalide'),
  birthday: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfileUpdateForm({ user }) {
  const { notify } = useNotification()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: user,
  })

  async function onSubmit(data) {
    try {
      // API call
      notify.success('Profil mis à jour!')
    } catch {
      notify.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* Pseudo */}
      <motion.div whileHover={{ scale: 1.02 }}>
        <Input
          label="Pseudo"
          icon={User}
          error={!!errors.pseudo}
          errorMessage={errors.pseudo?.message}
          {...register('pseudo')}
        />
      </motion.div>

      {/* Email */}
      <motion.div whileHover={{ scale: 1.02 }}>
        <Input
          label="Email"
          type="email"
          icon={Mail}
          error={!!errors.email}
          errorMessage={errors.email?.message}
          {...register('email')}
        />
      </motion.div>

      {/* Birthday */}
      <motion.div whileHover={{ scale: 1.02 }}>
        <Input
          label="Date de naissance"
          type="date"
          icon={Calendar}
          error={!!errors.birthday}
          errorMessage={errors.birthday?.message}
          {...register('birthday')}
        />
      </motion.div>

      {/* Submit */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          type="submit"
          isLoading={isSubmitting}
          icon={Save}
          className="w-full"
        >
          Enregistrer les modifications
        </Button>
      </motion.div>
    </motion.form>
  )
}
```

---

## 📊 Résumé quick reference

| Librairie | Usage | Exemple |
|-----------|-------|---------|
| **Sonner** | Notifications | `notify.success('Ok!')` |
| **React-Hook-Form** | Gestion forms | `useForm()` + `register` |
| **Zod** | Validation | `z.string().email()` |
| **Lucide** | Icônes | `<Mail size={24} />` |
| **Date-fns** | Dates | `format(date, 'dd/MM/yyyy')` |
| **Framer Motion** | Animations | `<motion.div>` |

---

## 🚀 Prochaines étapes

1. ✅ Dépendances installées
2. ✅ NotificationContext configuré
3. ✅ Button et Input components créés
4. ✅ LoginForm exemple avec Zod + RHF
5. ⏳ Convertir autres pages avec ces outils
6. ⏳ Ajouter animations Framer Motion
7. ⏳ Tests de formulaires

---

**Ready to build beautiful, functional forms and animations! 🚀**
