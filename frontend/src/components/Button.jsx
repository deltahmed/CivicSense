import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  icon: Icon,
  className = '', 
  ...props 
}, ref) => {
  const baseStyles = "font-semibold rounded transition flex items-center justify-center gap-2"
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400",
    ghost: "text-blue-600 hover:bg-blue-50 disabled:text-gray-400",
    outline: "border-2 border-gray-300 text-gray-900 hover:bg-gray-50 disabled:border-gray-100",
  }

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 size={20} className="animate-spin" />}
      {Icon && !isLoading && <Icon size={20} />}
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
