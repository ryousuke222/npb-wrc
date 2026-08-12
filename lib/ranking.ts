/**
 * 並び替え済みの一覧に「1, 1, 3」の競技順位を付ける。
 * 画面上で同じ値に見える項目は同順位にするため、呼び出し側は
 * 数値そのものではなく表示用に丸めた文字列をキーとして渡す。
 */
export function competitionRanks<T>(
  items: readonly T[],
  getDisplayedValue: (item: T) => string | number
): number[] {
  let currentRank = 0;
  let previousValue: string | number | undefined;

  return items.map((item, index) => {
    const value = getDisplayedValue(item);
    if (index === 0 || value !== previousValue) {
      currentRank = index + 1;
      previousValue = value;
    }
    return currentRank;
  });
}
