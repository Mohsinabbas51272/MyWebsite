import { useState, useEffect, useCallback } from 'react';

export interface AccentColorOption {
  id: string;
  label: string;
  hex: string;
  hexRgb: string; // for rgba usage
}

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  { id: 'purple', label: 'Violet Nebula', hex: '#8b5cf6', hexRgb: '139, 92, 246' },
  { id: 'blue', label: 'Deep Blue', hex: '#3b82f6', hexRgb: '59, 130, 246' },
  { id: 'cyan', label: 'Cyber Cyan', hex: '#06b6d4', hexRgb: '6, 182, 212' },
  { id: 'emerald', label: 'Emerald Mint', hex: '#10b981', hexRgb: '16, 185, 129' },
  { id: 'amber', label: 'Amber Gold', hex: '#f59e0b', hexRgb: '245, 158, 11' },
  { id: 'rose', label: 'Electric Rose', hex: '#f43f5e', hexRgb: '244, 63, 94' },
  { id: 'orange', label: 'Neon Orange', hex: '#f97316', hexRgb: '249, 115, 22' },
  { id: 'pink', label: 'Hot Pink', hex: '#ec4899', hexRgb: '236, 72, 153' },
];

const STORAGE_KEY = 'apex-accent-color';
const DEFAULT_COLOR_ID = 'purple';

function applyColorToDOM(color: AccentColorOption) {
  const root = document.documentElement;
  root.style.setProperty('--accent-purple', color.hex);
  root.style.setProperty('--accent-purple-rgb', color.hexRgb);
  // Also update the shadow-glow to match the new accent
  root.style.setProperty(
    '--shadow-glow',
    `0 0 20px rgba(${color.hexRgb}, 0.15), 0 0 40px rgba(${color.hexRgb}, 0.05)`
  );
}

export function useThemeColor() {
  const [activeColorId, setActiveColorId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COLOR_ID;
  });

  const activeColor = ACCENT_COLOR_OPTIONS.find((c) => c.id === activeColorId) || ACCENT_COLOR_OPTIONS[0];

  // Apply on mount
  useEffect(() => {
    applyColorToDOM(activeColor);
  }, []);

  const setAccentColor = useCallback((colorId: string) => {
    const color = ACCENT_COLOR_OPTIONS.find((c) => c.id === colorId);
    if (!color) return;
    setActiveColorId(colorId);
    localStorage.setItem(STORAGE_KEY, colorId);
    applyColorToDOM(color);
  }, []);

  const resetToDefault = useCallback(() => {
    setAccentColor(DEFAULT_COLOR_ID);
  }, [setAccentColor]);

  return { activeColorId, activeColor, setAccentColor, resetToDefault, colors: ACCENT_COLOR_OPTIONS };
}
