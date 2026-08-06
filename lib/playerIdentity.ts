import type { BatterRanking } from "./types";

type LegacyIdentityOverride = {
  id: string;
  firstYear: number;
  lastYear: number;
};

/**
 * NPB公式IDを取得できなかった過去データのうち、年度・所属の連続性から同一人物を
 * 確認できた選手だけを明示的に補う。範囲外の同名選手は絶対に統合しない。
 */
const LEGACY_IDENTITY_OVERRIDES: Record<string, LegacyIdentityOverride> = {
  "李承ヨプ": { id: "legacy:李承ヨプ", firstYear: 2005, lastYear: 2011 },
  "川崎宗則": { id: "legacy:川崎宗則", firstYear: 2005, lastYear: 2011 },
  "高橋信二": { id: "legacy:高橋信二", firstYear: 2005, lastYear: 2014 },
  "山崎浩司": { id: "legacy:山崎浩司", firstYear: 2005, lastYear: 2015 },
  "亀井義行": { id: "legacy:亀井義行", firstYear: 2005, lastYear: 2012 },
  "小島紳二郎": { id: "legacy:小島紳二郎", firstYear: 2005, lastYear: 2006 },
  "高橋秀聡": { id: "legacy:高橋秀聡", firstYear: 2006, lastYear: 2010 },
  "高谷裕亮": { id: "legacy:高谷裕亮", firstYear: 2007, lastYear: 2015 },
  "大崎雄太朗": { id: "legacy:大崎雄太朗", firstYear: 2007, lastYear: 2015 },
  "銀仁朗": { id: "legacy:銀仁朗", firstYear: 2007, lastYear: 2011 },
  "宮崎充登": { id: "legacy:宮崎充登", firstYear: 2007, lastYear: 2008 },
  "中東直瑛": { id: "legacy:中東直瑛", firstYear: 2008, lastYear: 2009 },
  "一輝": { id: "legacy:一輝", firstYear: 2008, lastYear: 2012 },
  "斉藤俊雄": { id: "legacy:斉藤俊雄", firstYear: 2008, lastYear: 2011 },
  "岩崎達郎": { id: "legacy:岩崎達郎", firstYear: 2008, lastYear: 2015 },
  "鬼崎裕司": { id: "legacy:鬼崎裕司", firstYear: 2008, lastYear: 2015 },
  "岩崎恭平": { id: "legacy:岩崎恭平", firstYear: 2009, lastYear: 2015 },
  "岡崎太一": { id: "legacy:岡崎太一", firstYear: 2009, lastYear: 2015 },
  "高濱卓也": { id: "legacy:高濱卓也", firstYear: 2011, lastYear: 2015 },
  "林崎遼": { id: "legacy:林崎遼", firstYear: 2011, lastYear: 2014 },
  "宮崎祐樹": { id: "legacy:宮崎祐樹", firstYear: 2012, lastYear: 2015 },
  "高城俊人": { id: "legacy:高城俊人", firstYear: 2012, lastYear: 2015 },
  "中崎翔太": { id: "legacy:中崎翔太", firstYear: 2012, lastYear: 2013 },
  "キラ": { id: "legacy:キラ", firstYear: 2013, lastYear: 2014 },
  "川崎成晃": { id: "legacy:川崎成晃", firstYear: 2013, lastYear: 2015 },
  "宮崎敏郎": { id: "legacy:宮崎敏郎", firstYear: 2013, lastYear: 2015 },
  "高田知季": { id: "legacy:高田知季", firstYear: 2013, lastYear: 2015 },
  "メルセデス": { id: "legacy:メルセデス", firstYear: 2018, lastYear: 2024 },
};

/**
 * 選手を年度横断でまとめるための内部キー。
 *
 * NPB公式の選手ID（nameKey）がある行は、改名・移籍後も同一人物として追跡する。
 * ID未解決でも同一人物を確認できた過去データは限定的な上書きでまとめる。それ以外は
 * 名前だけで統合せず（例: 年代・球団が異なる「ガルシア」）、年度・球団まで含めた
 * 一意キーとして扱う。
 */
export function playerIdentityKey(
  batter: Pick<BatterRanking, "name" | "nameKey" | "year" | "teamId">
): string {
  if (batter.nameKey) return batter.nameKey;

  const name = batter.name.normalize("NFKC").replace(/[\s　]/g, "");
  const override = LEGACY_IDENTITY_OVERRIDES[name];
  if (override && batter.year >= override.firstYear && batter.year <= override.lastYear) {
    return override.id;
  }

  return `unresolved:${name}|${batter.year}|${batter.teamId}`;
}
