'use client'

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from '@chakra-ui/react'

/**
 * Chakra UI v3 provider with global CSS resets disabled.
 *
 * defaultSystem injects base styles (body font, button resets, etc.) that
 * conflict with the app's existing Tailwind + inline-style design system.
 * Passing an empty globalCss prevents any global injection while keeping all
 * component-scoped emotion styles (ColorPicker, etc.) intact.
 */
const system = createSystem(defaultConfig, defineConfig({ globalCss: {} }))

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      {children}
    </ChakraProvider>
  )
}
