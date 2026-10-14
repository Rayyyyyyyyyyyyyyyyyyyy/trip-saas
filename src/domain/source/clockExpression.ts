const DAYPART =
  "(?:上午|下午|早上|早晨|中午|傍晚|晚上|夜間|凌晨|午夜|(?<![A-Za-z])(?:noon|midnight|a\\.?m\\.?|p\\.?m\\.?)(?![A-Za-z]))";
const CHINESE_HOUR =
  "(?:二十[一二三]?|十[一二三四五六七八九]?|[一二兩三四五六七八九])";
const CLOCK = new RegExp(
  `(?<![\\d:.])(?<prefix>${DAYPART}[ \\t]*)?(?<clock>(?<hour>[01]?\\d|2[0-3])(?<notation>:[0-5]\\d|\\.[0-5]\\d|點(?:半|[0-5]?\\d分?)?)|(?<chinese>${CHINESE_HOUR})點(?:半|[一二三四五六七八九十]{1,3}分)?)(?![\\d:.])(?<suffix>[ \\t]*${DAYPART})?`,
  "giu",
);
const TWELVE_HOUR_CONTEXT =
  /(?:(?:12|十二)\s*(?:小時|小时)\s*制|12[ -]+hour\s+(?:clock|format))/iu;
const TWENTY_FOUR_HOUR_CONTEXT =
  /(?:(?:24|二十四)\s*(?:小時|小时)\s*制|24[ -]+hour\s+(?:clock|format))/iu;

function chineseHour(text: string): number {
  const digits = "一二三四五六七八九";
  if (text === "兩") return 2;
  if (!text.includes("十")) return digits.indexOf(text) + 1;
  const [tens, ones] = text.split("十");
  return (
    (tens ? digits.indexOf(tens) + 1 : 1) * 10 +
    (ones ? digits.indexOf(ones) + 1 : 0)
  );
}

function expressionsIn(text: string) {
  return [...text.matchAll(CLOCK)].map((match) => ({
    text: match[0],
    clock: match.groups!.clock,
    hour: match.groups!.chinese
      ? chineseHour(match.groups!.chinese)
      : Number(match.groups!.hour),
    marker:
      Boolean(match.groups!.chinese) || match.groups!.notation.startsWith("點"),
    paddedHour: /^0\d/.test(match.groups!.clock),
    explicitDaypart: Boolean(match.groups!.prefix || match.groups!.suffix),
    // Only the nearby part of this source line can establish a clock format.
    context:
      text
        .slice(Math.max(0, match.index! - 64), match.index!)
        .split("\n")
        .at(-1)! +
      text
        .slice(match.index!, match.index! + match[0].length + 64)
        .split("\n", 1)[0],
  }));
}

/** Exact visible tokens for source-linked checks; no notation conversion. */
export function clockExpressionsIn(text: string): readonly string[] {
  return expressionsIn(text).map((expression) => expression.text);
}

/** Bounded ambiguity evidence, not a general clock parser or semantic proof.
 * Supplied evidence must already be resolved to the entity's own source refs.
 * Raw text alone cannot establish that the source supplied an ambiguous clock.
 */
export function hasAmbiguousClockExpression(
  rawText: string,
  evidenceTexts: readonly string[] = [rawText],
): boolean {
  const rawClocks = new Set(expressionsIn(rawText).map((item) => item.clock));
  return evidenceTexts.some((text) =>
    expressionsIn(text).some(
      (item) =>
        rawClocks.has(item.clock) &&
        !item.explicitDaypart &&
        !TWENTY_FOUR_HOUR_CONTEXT.test(item.context) &&
        (item.marker ||
          !item.paddedHour ||
          TWELVE_HOUR_CONTEXT.test(item.context)) &&
        ((item.hour >= 1 && item.hour <= 11) ||
          (item.hour === 12 &&
            (item.marker || TWELVE_HOUR_CONTEXT.test(item.context)))),
    ),
  );
}
