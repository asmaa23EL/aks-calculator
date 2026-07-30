'use client';

import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  if (isAdminRoute) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img
              src="/logo.png"
              alt="CloudDev Fusion Logo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                CloudDev Fusion
              </h1>
              <p className="text-xs text-gray-500">Excellence Azure & Cloud</p>
            </div>
          </a>

          <a
            href="https://www.clouddevfusion.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            www.clouddevfusion.com
          </a>
        </div>
      </div>
    </header>
  );
}
