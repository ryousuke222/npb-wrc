import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

function localIpv4Addresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

const nextConfig: NextConfig = {
  /* config options here */
  // localhostでの確認時に出るNext.jsの開発用ボタンは、サイトのUIと混同しやすいため非表示にする。
  devIndicators: false,
  // 開発サーバーに同じLAN内の他端末（スマホ実機での動作確認等）からアクセスできるようにする。
  // Next.jsは開発中、localhost以外からのdevアセット・RSCリクエストをデフォルトでブロックするため。
  // DHCPでLAN IPが変わっても、その時点のアドレスを自動で許可する。
  allowedDevOrigins: localIpv4Addresses(),
};

export default nextConfig;
