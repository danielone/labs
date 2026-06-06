'use client'

import { useState, useRef } from 'react'
import {
  ChakraProvider,
  ColorPicker,
  createSystem,
  defaultConfig,
  defineConfig,
  parseColor,
  type Color,
} from '@chakra-ui/react'

// Scoped Chakra system — no global CSS so nothing leaks outside this component
const system = createSystem(defaultConfig, defineConfig({ globalCss: {} }))

interface Props {
  value: string
  onChange: (hex: string) => void
}

function ColorPickerInner({ value, onChange }: Props) {
  const [color, setColor] = useState<Color>(() => {
    try { return parseColor(value) } catch { return parseColor('#fdfdfc') }
  })

  const [hexInput, setHexInput] = useState<string>(() => {
    try { return parseColor(value).toString('hex') } catch { return '#fdfdfc' }
  })

  const [open, setOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const applyColor = (c: Color) => {
    const hex = c.toString('hex')
    setColor(c)
    setHexInput(hex)
    onChange(hex)
  }

  const handleHexInputChange = (raw: string) => {
    setHexInput(raw)
    const v = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      try { applyColor(parseColor(v)) } catch {}
    }
  }

  const handleHexBlur = (raw: string) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`
    try {
      applyColor(parseColor(v))
    } catch {
      setHexInput(color.toString('hex'))
    }
  }

  return (
    <ColorPicker.Root
      value={color}
      onValueChange={(e) => applyColor(e.value)}
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
    >
      <ColorPicker.HiddenInput />

      {/* Control row — inline-flex so it shrinks to content width */}
      <div
        ref={rowRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: '#fdfdfc',
          border: '1px solid #dfdcd7',
          borderRadius: 8,
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      >
        {/* Colored square — single element, no Chakra Trigger sub-elements */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open color picker"
          style={{
            width: 20,
            height: 20,
            minWidth: 20,
            background: hexInput,
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.15)',
            flexShrink: 0,
            cursor: 'pointer',
            padding: 0,
            display: 'block',
          }}
        />

        {/* Hex text input — 7ch fits #rrggbb exactly */}
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexInputChange(e.target.value)}
          onFocus={() => {
            if (rowRef.current) rowRef.current.style.borderColor = '#a0bfa8'
          }}
          onBlur={(e) => {
            handleHexBlur(e.currentTarget.value)
            if (rowRef.current) rowRef.current.style.borderColor = '#dfdcd7'
          }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            color: '#39342f',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            padding: 0,
            width: '7ch',
            boxShadow: 'none',
          }}
        />
      </div>

      {/* Popover portal — still receives ChakraProvider context via React fiber */}
      <ColorPicker.Positioner>
        <ColorPicker.Content
          style={{
            background: '#fdfdfc',
            border: '1px solid #dfdcd7',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
            padding: 16,
            zIndex: 2000,
            minWidth: 260,
          }}
        >
          <ColorPicker.Area style={{ borderRadius: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <ColorPicker.EyeDropper size="xs" variant="outline" style={{ flexShrink: 0 }} />
            <ColorPicker.Sliders style={{ flex: 1 }} />
          </div>
        </ColorPicker.Content>
      </ColorPicker.Positioner>
    </ColorPicker.Root>
  )
}

/**
 * Widget Base color picker field.
 * ChakraProvider is scoped to this component only — nothing leaks into
 * the rest of the app (no global CSS resets, no token overrides).
 */
export default function WidgetBaseColorPicker(props: Props) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 500,
          color: '#636260',
          marginBottom: 5,
        }}
      >
        Widget Base
      </label>
      <ChakraProvider value={system}>
        <ColorPickerInner {...props} />
      </ChakraProvider>
    </div>
  )
}
