import "./globals.css";

export const metadata = {
  title: "WU-FundConnect",
  description: "ระบบจับคู่โครงการวิจัยกับแหล่งทุนภายนอก",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="light">
      <body>{children}</body>
    </html>
  );
}