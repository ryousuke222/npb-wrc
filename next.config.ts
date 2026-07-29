import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // localhostでの確認時に出るNext.jsの開発用ボタンは、サイトのUIと混同しやすいため非表示にする。
  devIndicators: false,
  // 開発サーバーに同じLAN内の他端末（スマホ実機での動作確認等）からアクセスできるようにする。
  // Next.jsは開発中、localhost以外からのdevアセット・RSCリクエストをデフォルトでブロックするため。
  // allowedDevOriginsは完全一致か "*.example.com" 形式のワイルドカードのみ対応（CIDR指定は不可）。
  // このMacのLAN IPが変わった場合（DHCPの再割り当て等）はここも更新が必要。
  allowedDevOrigins: ["192.168.0.241"],
};

export default nextConfig;
