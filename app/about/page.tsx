export const metadata = {
  title: "このサイトについて | NPB最強打者ランキング",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        このサイトについて
      </h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">概要</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          このサイトは、NPB（日本プロ野球）の各年度における打者の成績をもとに、
          セイバーメトリクス指標のひとつであるwRC+（Weighted Runs Created
          Plus）を独自に算出し、年度別のランキングとして表示する個人プロジェクトです。
          初期表示は規定打席（チーム試合数×3.1、端数四捨五入）に到達した打者のみですが、
          最低打席数の条件は画面上で自由に変更でき、規定打席未満の打者も表示できます。
          選手個別のページでは、同姓同名判定（名前の完全一致）による年度別成績の推移も確認できます。
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-bold text-amber-900">
          ご注意：DELTA社等の公表値とは一致しません
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          当サイトのwRC+は、DELTA社「1.02 Essence of
          Baseball」やその他のサイトが公表しているwRC+とは<strong>完全には一致しません</strong>
          （2025年での検証では平均で数点程度の差）。これはバグではなく、以下の理由による仕様上の違いです。
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-amber-900">
          <li>
            wOBAの線形加重係数はNPB向けの近似値（下記参照）を採用していますが、DELTA社等が算出している年度別の厳密な係数とは異なります。特に「失策出塁」の項は現状のデータでは反映できていません。
          </li>
          <li>
            パークファクターも、DELTA社は複数年平均・詳細な補正を行っているとみられますが、当サイトは3年プールの簡易計算です。
          </li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          そのため当サイトのwRC+は「公式・正確な値」ではなく、
          <strong>同一年度・同一リーグ内での相対的な打者評価の目安</strong>
          としてご利用ください。詳しい算出方法は下記をご覧ください。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">データの出典</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          打席・打数・安打・本塁打・四死球などの基礎成績は
          <a
            href="https://npb.jp/bis/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            NPB.jp 日本野球機構
          </a>
          が公開している個人打撃成績・チーム打撃成績のページを出典としています。
          NPB公式サイトは掲載情報の二次利用・無断転載を禁じているため、当サイトでは元の成績表をそのまま転載せず、
          そこから独自に算出した指標（wRC+等）を中心とした引用の範囲にとどめて掲載しています。
          一次データの詳細を確認したい場合は、上記のNPB公式サイトをご参照ください。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">wRC+の算出方法（簡易版であることの注意）</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          本来wRC+の算出には、その年・そのリーグ独自の線形加重（wOBA）係数が必要です。しかしNPBはこの係数を無料で公表していないため、
          当サイトでは以下の近似的な方法で計算しています（パークファクターについては後述の通り試合結果から独自に算出しています）。
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-700">
          <li>
            wOBAの線形加重係数には、NPB向けの近似値（uBB 0.692 / HBP 0.73 /
            単打 0.865 / 二塁打 1.334 / 三塁打 1.725 / 本塁打
            2.065）を使用しています。この係数には本来「失策出塁」の項（係数0.966）も含まれますが、
            NPB公式サイトの通常の打撃成績表には失策出塁数が掲載されておらず現状のデータでは取得できないため、
            当サイトではこの項を省略しています（＝失策で出塁した分はwOBA・wRC+にわずかに反映されません）。
          </li>
          <li>
            wOBAスケール定数は、上記の係数で算出したチームwOBAとリーグ平均との差が、
            チームの実際の得点/打席とリーグ平均との差をどれだけ説明するかを、2005年以降の全球団・全年度
            （264チームシーズン分）で回帰分析し、経験的に導出した値（1.372、決定係数R²=0.8605）を使用しています。
            算出スクリプトは
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              scripts/derive-woba-scale.ts
            </code>
            です。
          </li>
          <li>
            リーグ平均（wRC+の分母）は、<strong>投手の打席を除いた</strong>
            規定打席未満の選手も含む全打者の成績を合算して算出しています。
            セ・リーグはDH制がなく投手も打席に立ちますが、打撃力の低い投手の打席を含めるとリーグ平均が実態より低く出て、
            結果として全打者のwRC+が過大に出てしまう問題があったため、各球団の投手成績ページ（idp1_xx.html）から投手名の一覧を取得し、
            リーグ平均の算出対象から除外しています（選手個人の代打成績等の表示自体は従来通り行います）。
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-zinc-700">
          年度間・NPBとMLB間の厳密な比較には適さない点にもご注意ください（DELTA社等との差異については上記の注意書きを参照）。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">パークファクター（球場補正）</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          球場によって本塁打の出やすさなどが異なるため、当サイトでは以下の方法で年度・球団ごとのパークファクターを算出し、wRC+に反映しています。
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-700">
          <li>
            NPB公式サイトの試合日程・結果ページから、公式戦の全試合の得点・失点・本拠地／ビジターの別・球場名を集計しています。
          </li>
          <li>
            <strong>交流戦は除外しています。</strong>
            交流戦を含めると「本拠地でしか対戦しない相手」「敵地でしか対戦しない相手」が生じ、本拠地とビジターで対戦相手の内訳が揃わなくなるためです。
          </li>
          <li>
            <strong>
              地方球場（プロモーション目的の臨時開催試合）も除外しています。
            </strong>
            その球団の同一リーグ本拠地試合のうち球場別の使用割合が15%未満の球場を地方球場とみなします（オリックスの京セラドーム大阪／ほっと神戸のように、複数球場を正式に本拠地としているケースは両方とも残ります）。本拠地移転があった球団は、年度ごとにこの判定をやり直しています。
          </li>
          <li>
            単年（1球団あたり本拠地・ビジター各60試合前後）だけではサンプルが少なく数値がブレやすいため、
            <strong>球団ごとに複数年を加重プールして</strong>算出しています。
            本拠地移転・球場改修等がない球団は、対象年度を中心とした最大5年窓（対象年度に近い順に重み5・4・4・3・3）を使います。
            データ範囲の端（2005年付近・最新年度付近）で片側の年度が足りない場合は、自動的にもう片方向へ延長して5年分を確保します。
          </li>
          <li>
            <strong>
              本拠地移転・球場改修があった球団は、変化があった年を起点とする前方窓（未来方向のみ、最大5年、重み5・4・3・2・1）
            </strong>
            に切り替えます（広島東洋: 2009年マツダスタジアム移転 / 福岡ソフトバンク: 2015年テラス席設置 /
            北海道日本ハム: 2023年エスコンフィールド移転）。変化前のデータを混ぜるとパークファクターが歪むためです。
          </li>
          <li>
            <strong>
              プールしたサンプル年数（1〜5年）に応じた信頼度（1年=0.5・2年=0.6・3年=0.7・4年=0.8・5年=0.9）で、
              算出値をリーグ平均(1.0)側へ回帰させています
            </strong>
            （最終値 = 加重平均PF × 信頼度 + 1.0 × (1 − 信頼度)）。プールできる年数が少ないほど測定誤差が大きいとみなし、平均側に引き戻します。
          </li>
          <li>
            球団ごとに
            <strong>
              パークファクター = 本拠地の1試合あたり得点+失点 ÷「6本拠地（自チーム含む）で均等にプレーした場合の期待値」
            </strong>
            を算出しています。分母は「ビジターの1試合あたり得点+失点 × 5/6 ＋ 本拠地の1試合あたり得点+失点
            × 1/6」で、単純な本拠地÷ビジターの比ではなく、リーグの6本拠地平均（自チームの球場も1/6含む）を基準にすることでより正確な値になります。
          </li>
          <li>
            本拠地・ビジターそれぞれの実試合数（プール全体の合計）が一定数（40試合）に満たない球団・年度は算出対象外とし、その場合は補正なし（PF=1）として扱っています。
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-zinc-700">
          年度・球団ごとの算出値は
          <a href="/park-factors" className="underline underline-offset-2">
            パークファクター一覧
          </a>
          で確認できます。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">打席単位でのパークファクター適用</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          単純に「打者は年間の試合のうち約半分しか本拠地でプレーしないから、パークファクターを1.0側に半減させて使う」という近似は、
          ロード時の対戦環境を常にリーグ平均(1.0)とみなす前提に基づいています。しかし実際には、ある球団のロード対戦相手は主に自リーグの他5球団であり、
          <strong>自チームの本拠地は自分自身のロード平均には含まれません</strong>。そのため自チームの本拠地が極端な値（例:
          神宮のように打者有利、甲子園のように投手有利）である球団ほど、この近似は実態とズレます。
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-700">
          <li>
            当サイトでは、全打者について試合ごとの出場ログ（どの球場で何打席立ったか）をNPB公式サイトの試合結果ページから取得し、
            <strong>選手が実際にその年対戦した球場のパークファクター（生の値）を打席数で加重平均</strong>
            した「個人の実効パークファクター」を算出してwRC+に適用しています。地方球場での試合はPF=1（補正なし）として扱います。
          </li>
          <li>
            試合ごとの出場ログはNPB公式サイトのテンプレート変更（2025〜2026年頃）に伴い2方式（新旧テンプレート）でパースしています。
            選手名の突き合わせは、成績表側のフルネームと出場ログ側の表示名（姓のみ、または同姓の選手がいる場合のみ姓+名の一部）を前方一致で照合しており、
            一致しなかった選手（ごく少数）はチーム一律のパークファクターにフォールバックしています。
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">対象範囲・打席数フィルターについて</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          2005年度以降は、NPB公式サイトのチーム別打撃成績ページから、各球団の全打者（投手の代打・代走成績なども含む）を対象にwRC+を算出しています。
          画面上部の「最低打席数」でその年度に表示する打者を絞り込めます。
          規定打席を下回るサンプルサイズの小さい成績は、少ない打席数でたまたま結果が出た（あるいは出なかった）影響が大きく、
          wRC+の値が極端に高く・低く出ることがある点にご注意ください。
        </p>
        <p className="text-sm leading-relaxed text-zinc-700">
          また画面上部のプルダウンから、セ・リーグ／パ・リーグ別、または球団別のランキングに絞り込むこともできます。
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">2005年より前のデータについて（簡易版）</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          NPB公式サイトの試合単位データ（得点・失点・本拠地等）は2005年度分までしか存在しないため、それより前の年度は
          「プロ野球在籍者名簿」（選手の50音順一覧）と各選手の個人ページの年度別打撃成績を出典として、独自に集計しています。
          この方式には以下の制約があり、2005年以降のデータより精度が落ちる簡易版であることにご注意ください。
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-700">
          <li>
            <strong>1995〜2004年はパークファクターを算出しています。</strong>
            npb.jp公式サイトには試合単位データがないため、個人運営の記録サイト「2689web.com」（1936年以降の公式戦全試合ボックススコアを収録）から球場・本拠地/ビジター・スコアを取得し、2005年以降と同じ5年窓＋信頼度回帰の手法で算出しています。
            <strong>1994年以前はまだこのデータ収集が完了しておらず、PF=1（補正なし）のままです。</strong>
          </li>
          <li>
            <strong>敬遠（IBB）は常に0として扱っています。</strong>
            選手個人ページの年度別成績表に敬遠の列がないため、四球はすべて非故意四球として計算しています。
          </li>
          <li>
            投手の除外は、選手個人ページに投手成績表が存在するかどうかで判定しています（その選手が経歴のどこかで登板歴があれば、打撃成績も含めて投手として扱いリーグ平均から除外）。年度ごとの正確な判定ではない点にご注意ください。
          </li>
          <li>
            規定打席の算出に使う球団の試合数は、NPB公式サイトの「年度別成績」ページのチーム勝敗表から取得しています。
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">歴代ランキング・選手検索</h2>
        <p className="text-sm leading-relaxed text-zinc-700">
          <a href="/all-time" className="underline underline-offset-2">
            歴代ランキング
          </a>
          では、収録している全シーズンを横断してwRC+が高い順に表示します（シーズン単位のランキングで、通算成績のランキングではありません）。
          <a href="/search" className="underline underline-offset-2">
            選手検索
          </a>
          では選手名から直近シーズンの成績ページを探せます。
        </p>
      </section>
    </div>
  );
}
