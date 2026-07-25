import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Calculateur ROI Azure AKS - CloudDev Fusion',
  description: 'Estimez vos économies en migrant vers Azure Kubernetes Service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
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
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                www.clouddevfusion.com
              </a>
            </div>
          </div>
        </header>
        <main className="min-h-screen">
          {children}
        </main>
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
                      78, Avenue des Champs-Élysées,<br/>
                      Bureau 326, 75008 Paris
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🌐</span>
                    <a href="https://www.clouddevfusion.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                      www.clouddevfusion.com
                    </a>
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
      </body>
    </html>
  );
}
