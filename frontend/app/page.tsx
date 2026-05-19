'use client';
import { useEffect, useState } from 'react';
import { getDashboardStats, downloadReport } from '@/lib/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Users, TrendingDown, DollarSign } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-400 p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ✅ UPDATED HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time retention overview</p>
        </div>
        <button
          onClick={async () => {
            const blob = await downloadReport();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `retention-report-${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          📄 Download PDF Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Customers', value: stats.activeCustomers, icon: Users, color: 'text-indigo-400' },
          { label: 'Churn Rate', value: `${stats.churnRate}%`, icon: TrendingDown, color: 'text-red-400' },
          { label: 'Monthly MRR', value: `$${stats.mrr.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'High Risk', value: stats.highRisk, icon: AlertTriangle, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Plan Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.planBreakdown}
                dataKey="count"
                nameKey="plan_type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {stats.planBreakdown.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Customers by Industry</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.industryBreakdown} layout="vertical">
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis dataKey="industry" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top At-Risk Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Top 10 At-Risk Customers</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left pb-3">Customer</th>
              <th className="text-left pb-3">Plan</th>
              <th className="text-left pb-3">MRR</th>
              <th className="text-left pb-3">Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {stats.topAtRisk.map((c: any) => (
              <tr key={c.customer_id} className="border-b border-gray-800/50">
                <td className="py-3">
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-gray-500 text-xs">{c.email}</p>
                </td>
                <td className="py-3 text-gray-300">{c.plan_type}</td>
                <td className="py-3 text-green-400">${c.subscription_value}</td>
                <td className="py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.risk_score >= 0.7
                        ? 'bg-red-900/50 text-red-300'
                        : c.risk_score >= 0.4
                        ? 'bg-yellow-900/50 text-yellow-300'
                        : 'bg-green-900/50 text-green-300'
                    }`}
                  >
                    {(c.risk_score * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}