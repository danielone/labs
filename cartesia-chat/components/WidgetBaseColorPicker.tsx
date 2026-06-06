'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (hex: string) => void
  onReset?: () => void
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(s.startsWith('#') ? s : `#${s}`)
}

function normalizeHex(s: string): string {
  return s.startsWith('#') ? s : `#${s}`
}

export default function WidgetBaseColorPicker({ value, onChange, onReset }: Props) {
  const [hexInput, setHexInput] = useState(value)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  // Sync internal state when the parent resets the value (e.g. clicking Reset)
  useEffect(() => {
    setHexInput(value)
  }, [value])

  // Always show a valid color on the swatch; fall back to committed value
  const swatchColor = isValidHex(hexInput) ? normalizeHex(hexInput) : value

  const applyColor = (hex: string) => {
    setHexInput(hex)
    onChange(hex)
  }

  const handleHexChange = (raw: string) => {
    setHexInput(raw)
    if (isValidHex(raw)) onChange(normalizeHex(raw))
  }

  const handleHexBlur = (raw: string) => {
    if (isValidHex(raw)) {
      applyColor(normalizeHex(raw))
    } else {
      setHexInput(value) // revert to last valid committed color
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#636260' }}>
          Widget Base
        </label>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 11,
              fontWeight: 500,
              color: '#9b9895',
              cursor: 'pointer',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#39342f' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9b9895' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Wrapper: relative so the hidden native input can be stacked */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/*
          Native <input type="color"> — hidden, positioned over the swatch so
          clicking the swatch button (which programmatically clicks this input)
          opens the OS color picker. Width/height 0 so it never affects layout.
        */}
        <input
          ref={colorInputRef}
          type="color"
          value={swatchColor}
          onChange={(e) => applyColor(e.target.value)}
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: -26,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            border: 'none',
            padding: 0,
          }}
        />

        {/* Visible field: colored swatch + hex text input */}
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
          {/* Colored square — programmatically opens the native color picker */}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            aria-label="Pick a color"
            style={{
              width: 20,
              height: 20,
              minWidth: 20,
              background: swatchColor,
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
              cursor: 'pointer',
              padding: 0,
              display: 'block',
            }}
          />

          {/* Hex text input — matches other Design tab input styles */}
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
      </div>
    </div>
  )
}
