import "./globals.css";
import { Noto_Sans_Thai } from "next/font/google";

const noto = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata = {
  title: "WU-FundConnect",
  description: "ระบบเชื่อมโยงโครงการวิจัยกับแหล่งทุนภายนอก",
  icons: {
    icon: "/riie-logo.png",
    shortcut: "/riie-logo.png",
    apple: "/riie-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="light">
      <body className={noto.variable}>{children}</body>
    </html>
  );
}
