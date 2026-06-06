'use client'

import { useState, useRef, useEffect } from 'react'
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

  const rowRef    = useRef<HTMLDivElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const applyColor = (c: Color) => {
    const hex = c.toString('hex')
    setColor(c)
    setHexInput(hex)
    onChange(hex)
  }

  const handleHexChange = (raw: string) => {
    setHexInput(raw)
    const v = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      try { applyColor(parseColor(v)) } catch {}
    }
  }

  const handleHexBlur = (raw: string) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`
    try { applyColor(parseColor(v)) }
    catch { setHexInput(color.toString('hex')) }
  }

  return (
    /* ColorPicker.Root must wrap Area + Sliders + EyeDropper for state access */
    <ColorPicker.Root
      value={color}
      onValueChange={(e) => applyColor(e.value)}
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      style={{ width: 'fit-content' }}
    >
      <ColorPicker.HiddenInput />

      {/* Wrapper provides the relative anchor for the custom dropdown */}
      <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>

        {/* Control row — shrinks to fit the swatch + hex text */}
        <div
          ref={rowRef}
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
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
          {/* Colored square — toggles the dropdown */}
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

          {/* Hex text — 7ch fits #rrggbb exactly */}
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
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

        {/* Custom dropdown — absolutely anchored below the control row */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 2000,
              background: '#fdfdfc',
              border: '1px solid #dfdcd7',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
              padding: 16,
              minWidth: 260,
            }}
          >
            <ColorPicker.Area style={{ borderRadius: 8 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <ColorPicker.EyeDropper size="xs" variant="outline" style={{ flexShrink: 0 }} />
              <ColorPicker.Sliders style={{ flex: 1 }} />
            </div>
          </div>
        )}
      </div>
    </ColorPicker.Root>
  )
}

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
      {/* ChakraProvider scoped here — nothing leaks to the rest of the app */}
      <ChakraProvider value={system}>
        <ColorPickerInner {...props} />
      </ChakraProvider>
    </div>
  )
}
