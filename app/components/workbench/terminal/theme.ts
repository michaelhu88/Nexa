import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--nexa-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--nexa-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--nexa-elements-terminal-textColor'),
    background: cssVar('--nexa-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--nexa-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--nexa-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--nexa-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--nexa-elements-terminal-color-black'),
    red: cssVar('--nexa-elements-terminal-color-red'),
    green: cssVar('--nexa-elements-terminal-color-green'),
    yellow: cssVar('--nexa-elements-terminal-color-yellow'),
    blue: cssVar('--nexa-elements-terminal-color-blue'),
    magenta: cssVar('--nexa-elements-terminal-color-magenta'),
    cyan: cssVar('--nexa-elements-terminal-color-cyan'),
    white: cssVar('--nexa-elements-terminal-color-white'),
    brightBlack: cssVar('--nexa-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--nexa-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--nexa-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--nexa-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--nexa-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--nexa-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--nexa-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--nexa-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
