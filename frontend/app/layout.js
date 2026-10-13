import "./globals.css";

export const metadata = {
  title: "Parallax — Multi-Perspective Academic Reuse Detection",
  description: "A Multi-Perspective Semantic and Structural Similarity Detection System for Bangla-English Academic Reuse. DIU Software Engineering Capstone Project.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
