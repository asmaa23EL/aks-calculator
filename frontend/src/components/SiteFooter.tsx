'use client';

import { usePathname } from 'next/navigation';

export default function SiteFooter() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  if (isAdminRoute) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.png"
                alt="CloudDev Fusion Logo"
                className="h-8 w-auto"
              />
              <h3 className="text-lg font-bold">CloudDev Fusion</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Experts en migration Cloud et Azure Kubernetes Service.
              Nous accompagnons les entreprises dans leur transformation digitale.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span>📧</span>
                <a href="mailto:mouad.mikou@clouddevfusion.com" className="hover:text-primary-400">
                  mouad.mikou@clouddevfusion.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span>📞</span>
                <a href="tel:+33758597595" className="hover:text-primary-400">
                  +33 7 58 59 75 95
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span>📍</span>
                <div>
                  78, Avenue des Champs-Elysees,<br />
                  Bureau 326, 75008 Paris
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Nos Services</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✓ Migration vers Azure AKS</li>
              <li>✓ Consulting Cloud</li>
              <li>✓ Formation DevOps</li>
              <li>✓ Support 24/7</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>© 2025 CloudDev Fusion. Tous droits réservés. | <a href="#" className="hover:text-primary-400">Mentions légales</a> | <a href="#" className="hover:text-primary-400">RGPD</a></p>
        </div>
      </div>
    </footer>
  );
}
