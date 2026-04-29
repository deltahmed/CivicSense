import { forwardRef } from 'react'

const Input = forwardRef(({ 
  label, 
  error, 
  errorMessage, 
  icon: Icon, 
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={20} />
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            w-full px-4 py-2 border rounded-lg 
            transition focus:outline-none focus:ring-2
            ${Icon ? 'pl-10' : ''}
            ${error 
              ? 'border-red-500 focus:ring-red-500 bg-red-50' 
              : 'border-gray-300 focus:ring-blue-600 focus:border-blue-600'
            }
          `}
          {...props}
        />
      </div>
      
      {error && errorMessage && (
        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
