import "./globals.css";
import { Noto_Sans_Thai } from "next/font/google";

const noto = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata = {
  title: "WU-FundConnect",
  description: "ระบบจับคู่โครงการวิจัยกับแหล่งทุนภายนอก",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="light">
      <body className={noto.variable}>
        {children}
      </body>
    </html>
  );
}