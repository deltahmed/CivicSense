import { useForm } from 'react-hook-form'
import { zodResolver } from 'zod/dist/lodashEs'
import { z } from 'zod'
import Button from './Button'
import Input from './Input'
import { useNotification } from '../context/NotificationContext'
import { Mail, Lock } from 'lucide-react'

// Schéma de validation Zod
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm({ onSuccess }) {
  const { notify } = useNotification()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data) {
    try {
      // Exemple d'appel API
      // const response = await api.post('/auth/login/', data)
      // notify.success('Connexion réussie!')
      
      notify.success('Connexion réussie!')
      onSuccess?.(data)
    } catch (error) {
      notify.error(error.message || 'Erreur de connexion')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Connexion</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="votre.email@example.com"
          icon={Mail}
          error={!!errors.email}
          errorMessage={errors.email?.message}
          {...register('email')}
        />

        {/* Password */}
        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={!!errors.password}
          errorMessage={errors.password?.message}
          {...register('password')}
        />

        {/* Remember Me */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('rememberMe')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Se souvenir de moi</span>
        </label>

        {/* Submit Button */}
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
        >
          Connexion
        </Button>
      </form>
    </div>
  )
}
