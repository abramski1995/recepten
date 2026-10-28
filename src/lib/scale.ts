// Scales the leading quantity of an ingredient line, e.g. "200 g bloem" -> "400 g bloem".

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
};

const NUMBER = /^(?:(\d+)\s*([¼½¾⅓⅔⅛])|([¼½¾⅓⅔⅛])|(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+(?:[.,]\d+)?))/;

function parseNumber(text: string): { value: number; length: number } | null {
  const m = NUMBER.exec(text);
  if (!m) return null;
  let value: number;
  if (m[2]) value = Number(m[1]) + UNICODE_FRACTIONS[m[2]];
  else if (m[3]) value = UNICODE_FRACTIONS[m[3]];
  else if (m[6]) value = Number(m[4]) + Number(m[5]) / Number(m[6]);
  else if (m[8]) value = Number(m[7]) / Number(m[8]);
  else value = Number(m[9].replace(",", "."));
  return Number.isFinite(value) ? { value, length: m[0].length } : null;
}

export function formatQuantity(value: number): string {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
  return String(rounded).replace(".", ",");
}

export function scaleIngredient(text: string, factor: number): string {
  if (factor === 1) return text;
  const first = parseNumber(text);
  if (!first) return text;

  const afterFirst = text.slice(first.length);
  const range = /^(\s*[-–]\s*)/.exec(afterFirst);
  if (range) {
    const second = parseNumber(afterFirst.slice(range[1].length));
    if (second) {
      const rest = afterFirst.slice(range[1].length + second.length);
      return `${formatQuantity(first.value * factor)}${range[1]}${formatQuantity(second.value * factor)}${rest}`;
    }
  }
  return `${formatQuantity(first.value * factor)}${afterFirst}`;
}
