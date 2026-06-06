'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

/**
 * Minimal Chakra UI v3 provider.
 * No ThemeProvider — app is light-mode-only; Cartesia design tokens
 * are all inline styles, so dark-mode toggling is not needed.
 */
export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      {children}
    </ChakraProvider>
  )
}
