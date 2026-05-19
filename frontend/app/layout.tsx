'use client';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [user, loading, pathname]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (!user && pathname !== '/login' && pathname !== '/register') return null;

  if (pathname === '/login' || pathname === '/register') return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-950">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}