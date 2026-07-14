import { useEffect, useState } from 'react'

const STORAGE_KEY = 'wld-theme'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'light'
  )

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme }
}
