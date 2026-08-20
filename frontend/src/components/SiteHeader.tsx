'use client';

import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  if (isAdminRoute) {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-[linear-gradient(135deg,_#001F4D_0%,_#002B63_100%)] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <img src="/logo.png" alt="CloudDev Fusion" className="h-11 w-20 object-contain" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-white">CloudDev Fusion</h1>
            <p className="text-xs text-blue-100">Excellence Azure & Cloud</p>
          </div>
        </a>

        <a
          href="https://www.clouddevfusion.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-100 transition-colors hover:text-white"
        >
          www.clouddevfusion.com
        </a>
      </div>
    </header>
  );
}
