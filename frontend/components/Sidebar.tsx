'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, AlertTriangle, Activity, Zap, FileSearch, LogOut, Upload, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/risk-alerts', label: 'Risk Alerts', icon: AlertTriangle },
  { href: '/behaviour', label: 'Behaviour Explorer', icon: Activity },
  { href: '/retention', label: 'Retention Assistant', icon: Zap },
  { href: '/forensics', label: 'Churn Forensics', icon: FileSearch },
  { href: '/chat', label: 'AI Analyst', icon: Sparkles },
  { href: '/winback', label: 'Win-back Tracker', icon: Target },
  { href: '/upload', label: 'Import Data', icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">CustomerPulse</h1>
        <p className="text-xs text-gray-400 mt-1">Retention Intelligence</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-300 mb-1">{user?.name}</p>
        <p className="text-xs text-gray-500 mb-3">{user?.email}</p>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}