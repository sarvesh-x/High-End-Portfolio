import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "600"]
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "Sarvesh Kumar - Full Stack Developer",
  description: "A passionate full stack developer with expertise in React, Node.js, and cloud technologies.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} boot-loading`}>
      <body>
        <style>{`/* critical loader styles */
.boot-loading body>:not(.loader){opacity:0!important;visibility:hidden!important}
body{overflow:hidden;margin:0}
.loader{position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:1;visibility:visible;background:#0f0f0f;overflow:hidden}
.loader-content{position:absolute;top:50%;left:50%;z-index:2;display:flex;flex-direction:column;align-items:center;gap:20px;transform:translate(-50%,-50%)}
.loader-content svg{display:block;width:30px;height:auto}
.loader-line{position:relative;width:200px;height:1px;overflow:hidden;background:rgba(255,255,255,.1)}
.loader-bar{position:absolute;inset:0 auto 0 0;width:0%;height:1px;background:#fff}
.loader-pct{font-family:monospace;font-size:12px;letter-spacing:1px;color:#fff}
`}</style>
        <div className="loader" id="boot-loader">
          <div className="loader-content">
            <svg width="49" height="35" viewBox="0 0 49 35" fill="none" aria-hidden="true">
              <path d="M14 7V35L0 28V0L14 7ZM31.5 7V35L17.5 28V0L31.5 7ZM49 7V35L35 28V0L49 7Z" fill="white" />
            </svg>
            <div className="loader-line">
              <div className="loader-bar" id="boot-loader-bar" />
            </div>
            <span className="loader-pct" id="boot-loader-pct">0%</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
