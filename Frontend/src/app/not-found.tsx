import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 py-16 text-center">
      <Image
        src="/bai_logo_blue-384.webp"
        alt="BAI Group of Companies"
        width={384}
        height={165}
        className="h-20 w-auto object-contain"
        priority
      />

      <p className="mt-10 text-7xl sm:text-8xl font-black tracking-tight text-[#0A2881]">
        404
      </p>
      <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm sm:text-base font-medium text-slate-500 leading-relaxed">
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-b from-[#F2C94C] to-[#E4BA37] text-[#0A2881] text-sm font-bold shadow-lg shadow-[#E4BA37]/30 transition-all hover:from-[#F7D45E] hover:to-[#EDC23E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2881]/40"
      >
        Back to BAI APP
      </Link>
    </div>
  );
}
