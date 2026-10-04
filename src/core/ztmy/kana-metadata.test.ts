import { describe, expect, it } from "vitest";
import { getZtmyKanaMetadata } from "@core/ztmy/kana-metadata";


describe("ZTMY kana metadata", () => {
  it("maps ordinary hiragana and voiced kana", () => {
    expect(getZtmyKanaMetadata("す")).toMatchObject({ row: "S", vowel: "U", romanization: "SU" });
    expect(getZtmyKanaMetadata("ず")).toMatchObject({ baseKana: "す", row: "S", vowel: "U", romanization: "ZU", isVoiced: true, conceptualRule: "rotate-left-90" });
    expect(getZtmyKanaMetadata("ぱ")).toMatchObject({ baseKana: "は", row: "H", vowel: "A", romanization: "PA", isSemiVoiced: true, conceptualRule: "rotate-right-90" });
    expect(getZtmyKanaMetadata("ゃ")).toMatchObject({ baseKana: "や", row: "Y", vowel: "A", isSmallKana: true, conceptualRule: "rotate-180" });
  });
  it("supports katakana and returns null for non-kana", () => {
    expect(getZtmyKanaMetadata("ズ")).toMatchObject({ baseKana: "ス", row: "S", romanization: "ZU", isVoiced: true });
    expect(getZtmyKanaMetadata("ス")).toMatchObject({ row: "S", vowel: "U", romanization: "SU" });
    expect(getZtmyKanaMetadata("漢")).toBeNull();
  });
  it("analyzes decomposed metadata without changing input normalization", () => {
    const canonicalText = "す\u3099".normalize("NFC");
    expect(canonicalText).toBe("ず");
    expect(getZtmyKanaMetadata(canonicalText)?.romanization).toBe("ZU");
  });
});
