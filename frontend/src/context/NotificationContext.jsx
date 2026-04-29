import React, { createContext, useContext } from 'react'
import { Toaster, toast } from 'sonner'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const notify = {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    warning: (message) => toast.warning(message),
    info: (message) => toast.info(message),
    loading: (message) => toast.loading(message),
  }

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        expand={false}
      />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
