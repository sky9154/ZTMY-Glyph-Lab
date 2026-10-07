export type KanaVowel = "A" | "I" | "U" | "E" | "O";
export type ConceptualRule = "normal" | "rotate-left-90" | "rotate-right-90" | "rotate-180";

export interface ZtmyKanaMetadata {
  character: string;
  baseKana: string;
  row: string | null;
  vowel: KanaVowel | null;
  romanization: string | null;
  isVoiced: boolean;
  isSemiVoiced: boolean;
  isSmallKana: boolean;
  conceptualRule: ConceptualRule;
}

const rows: Record<string, readonly [string, string, string]> = {
  "": ["あいうえお", "アイウエオ", "A I U E O"],
  K: ["かきくけこ", "カキクケコ", "KA KI KU KE KO"],
  S: ["さしすせそ", "サシスセソ", "SA SHI SU SE SO"],
  T: ["たちつてと", "タチツテト", "TA CHI TSU TE TO"],
  N: ["なにぬねの", "ナニヌネノ", "NA NI NU NE NO"],
  H: ["はひふへほ", "ハヒフヘホ", "HA HI FU HE HO"],
  M: ["まみむめも", "マミムメモ", "MA MI MU ME MO"],
  Y: ["や ゆ よ", "ヤ ユ ヨ", "YA  YU  YO"],
  R: ["らりるれろ", "ラリルレロ", "RA RI RU RE RO"],
  W: ["わ ゐ ゑ を", "ワ ヰ ヱ ヲ", "WA WI WE WO"],
  G: ["がぎぐげご", "ガギグゲゴ", "GA GI GU GE GO"],
  Z: ["ざじずぜぞ", "ザジズゼゾ", "ZA JI ZU ZE ZO"],
  D: ["だぢづでど", "ダヂヅデド", "DA JI ZU DE DO"],
  B: ["ばびぶべぼ", "バビブベボ", "BA BI BU BE BO"],
  P: ["ぱぴぷぺぽ", "パピプペポ", "PA PI PU PE PO"]
};

const smallToFull: Record<string, string> = {
  ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ", ゎ: "わ",
  ゕ: "か", ゖ: "け", ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ッ: "ツ", ヮ: "ワ", ヵ: "カ", ヶ: "ケ"
};
const modifiedRomanization: Record<string, string> = {
  が: "GA", ぎ: "GI", ぐ: "GU", げ: "GE", ご: "GO", ガ: "GA", ギ: "GI", グ: "GU", ゲ: "GE", ゴ: "GO",
  ざ: "ZA", じ: "JI", ず: "ZU", ぜ: "ZE", ぞ: "ZO", ザ: "ZA", ジ: "JI", ズ: "ZU", ゼ: "ZE", ゾ: "ZO",
  だ: "DA", ぢ: "JI", づ: "ZU", で: "DE", ど: "DO", ダ: "DA", ヂ: "JI", ヅ: "ZU", デ: "DE", ド: "DO",
  ば: "BA", び: "BI", ぶ: "BU", べ: "BE", ぼ: "BO", バ: "BA", ビ: "BI", ブ: "BU", ベ: "BE", ボ: "BO",
  ぱ: "PA", ぴ: "PI", ぷ: "PU", ぺ: "PE", ぽ: "PO", パ: "PA", ピ: "PI", プ: "PU", ペ: "PE", ポ: "PO"
};

const rowInfo = (character: string): { row: string; vowel: KanaVowel; romanization: string } | null => {
  const nfd = [...character.normalize("NFD")];

  if (nfd.length === 2 && ["\u3099", "\u309A"].includes(nfd[1])) {
    const base = nfd[0];
    const info = rowInfo(base);

    if (info) {
      return { ...info, romanization: modifiedRomanization[character] ?? info.romanization };
    }
  }

  for (const [row, [hira, kata, roman]] of Object.entries(rows)) {
    const chars = character >= "ァ" && character <= "ヺ" ? kata : hira;
    const index = chars.indexOf(character);

    if (index < 0 || chars[index] === " ") {
      continue;
    }

    const vowelIndex = [...chars.slice(0, index)].filter((part) => part !== " ").length;

    return {
      row: row || "V",
      vowel: "AIUEO"[vowelIndex] as KanaVowel,
      romanization: roman.trim().split(/\s+/)[vowelIndex]
    };
  }

  return null;
};

export const getZtmyKanaMetadata = (character: string): ZtmyKanaMetadata | null => {
  const full = smallToFull[character] ?? character;
  const info = rowInfo(full);

  if (!info) {
    return null;
  }

  const decomposed = [...character.normalize("NFD")];
  const isVoiced = decomposed.includes("\u3099");
  const isSemiVoiced = decomposed.includes("\u309A");
  const isSmallKana = character in smallToFull;
  const baseKana = isSmallKana ? full : isVoiced || isSemiVoiced ? decomposed[0] : character;

  return {
    character,
    baseKana,
    row: info.row,
    vowel: info.vowel,
    romanization: info.romanization,
    isVoiced,
    isSemiVoiced,
    isSmallKana,
    conceptualRule: isSmallKana ? "rotate-180" : isVoiced ? "rotate-left-90" : isSemiVoiced ? "rotate-right-90" : "normal"
  };
};
