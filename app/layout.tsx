import "./globals.css";

export const metadata = {
  title: "一人公司 (OPC-Bot)",
  description: "由 AI 驱动的一人公司管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='zh'>
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
