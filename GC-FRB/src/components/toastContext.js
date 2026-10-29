import { createContext, useContext } from 'react'

export const ToastCtx = createContext(() => {})
// const toast = useToast();  toast('Saved')  |  toast('Oops', 'error')  |  toast('FYI', 'info')
export const useToast = () => useContext(ToastCtx)
