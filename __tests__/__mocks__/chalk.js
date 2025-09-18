// Mock implementation of chalk
const chalk = {
  red: (text) => `[RED]${text}[/RED]`,
  green: (text) => `[GREEN]${text}[/GREEN]`,
  yellow: (text) => `[YELLOW]${text}[/YELLOW]`,
  blue: (text) => `[BLUE]${text}[/BLUE]`,
  magenta: (text) => `[MAGENTA]${text}[/MAGENTA]`,
  cyan: (text) => `[CYAN]${text}[/CYAN]`,
  white: (text) => `[WHITE]${text}[/WHITE]`,
  gray: (text) => `[GRAY]${text}[/GRAY]`,
  bold: (text) => `[BOLD]${text}[/BOLD]`,
  dim: (text) => `[DIM]${text}[/DIM]`,
  underline: (text) => `[UNDERLINE]${text}[/UNDERLINE]`,
  italic: (text) => `[ITALIC]${text}[/ITALIC]`,
  strikethrough: (text) => `[STRIKETHROUGH]${text}[/STRIKETHROUGH]`,
  inverse: (text) => `[INVERSE]${text}[/INVERSE]`,
  hidden: (text) => `[HIDDEN]${text}[/HIDDEN]`,
  visible: (text) => text,
  bgRed: (text) => `[BG_RED]${text}[/BG_RED]`,
  bgGreen: (text) => `[BG_GREEN]${text}[/BG_GREEN]`,
  bgYellow: (text) => `[BG_YELLOW]${text}[/BG_YELLOW]`,
  bgBlue: (text) => `[BG_BLUE]${text}[/BG_BLUE]`,
  bgMagenta: (text) => `[BG_MAGENTA]${text}[/BG_MAGENTA]`,
  bgCyan: (text) => `[BG_CYAN]${text}[/BG_CYAN]`,
  bgWhite: (text) => `[BG_WHITE]${text}[/BG_WHITE]`,
  bgBlack: (text) => `[BG_BLACK]${text}[/BG_BLACK]`
};

module.exports = chalk;
module.exports.default = chalk;