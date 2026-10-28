/**
 * Built-in equivalents for generated communications; independent of the website theme.
 * Browsers/mail clients use the first installed font, so glyph metrics can differ.
 * PDF uses the stable built-in PostScript families; sizes remain format-specific.
 */
export const COMMUNICATION_FONTS = {
  html: {
    heading: "'Times New Roman',Times,serif",
    body: "Arial,Helvetica,sans-serif",
  },
  pdf: {
    heading: "Times-Bold",
    body: "Helvetica",
    bodyBold: "Helvetica-Bold",
  },
} as const;
