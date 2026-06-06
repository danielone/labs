'use client'

import { useState, useRef } from 'react'
import {
  ColorPicker,
  parseColor,
  type Color,
} from '@chakra-ui/react'

interface Props {
  value: string
  onChange: (hex: string) => void
}

/**
 * Color picker for the Widget Base background color.
 * Built with Chakra UI v3 ColorPicker compound component.
 * Visual design matches the Cartesia Design-tab input fields.
 *
 * We use a custom hex <input> instead of ColorPicker.Input because
 * ColorPicker.Root's `format` prop only accepts "rgba"|"hsla"|"hsba" —
 * hex display is handled via Color.toString('hex') instead.
 */
export default function WidgetBaseColorPicker({ value, onChange }: Props) {
  const [color, setColor] = useState<Color>(() => {
    try { return parseColor(value) } catch { return parseColor('#fdfdfc') }
  })

  // Hex string shown in the text field
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
      // Revert to last valid hex if input was malformed
      setHexInput(color.toString('hex'))
    }
  }

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

      <ColorPicker.Root
        value={color}
        onValueChange={(e) => applyColor(e.value)}
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
      >
        {/* Hidden input for any surrounding form */}
        <ColorPicker.HiddenInput />

        {/*
          Control row — plain <div> for full styling control with no
          interference from Chakra's colorPicker slot recipe.
          Matches the Cartesia text-input style exactly.
        */}
        <div
          ref={rowRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#fdfdfc',
            border: '1px solid #dfdcd7',
            borderRadius: 8,
            width: '100%',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        >
          {/* Plain colored square — avoids Chakra's Trigger sub-elements */}
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

          {/* Hex text field — shows #rrggbb, matches other Design tab inputs */}
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
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: '#39342f',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              padding: 0,
              width: '100%',
              boxShadow: 'none',
            }}
          />
        </div>

        {/* Color picker popover — rendered via portal to document.body */}
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
            {/* HSB gradient area */}
            <ColorPicker.Area style={{ borderRadius: 8 }} />

            {/* Hue + alpha sliders + eyedropper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <ColorPicker.EyeDropper
                size="xs"
                variant="outline"
                style={{ flexShrink: 0 }}
              />
              <ColorPicker.Sliders style={{ flex: 1 }} />
            </div>
          </ColorPicker.Content>
        </ColorPicker.Positioner>
      </ColorPicker.Root>
    </div>
  )
}
