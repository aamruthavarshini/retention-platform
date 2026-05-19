'use client';
import { useEffect, useState } from 'react';
import { getCustomers } from '@/lib/api';
import { AlertTriangle, TrendingDown, Clock, DollarSign } from 'lucide-react';

export default function RiskAlerts() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');

  useEffect(() => {
    getCustomers({ status: 'Active' }).then(data => {
      setCustomers(data);
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter(c => {
    if (filter === 'high') return c.risk_score >= 0.7;
    if (filter === 'medium') return c.risk_score >= 0.4 && c.risk_score < 0.7;
    return c.risk_score >= 0.4;
  });

  const high = customers.filter(c => c.risk_score >= 0.7).length;
  const medium = customers.filter(c => c.risk_score >= 0.4 && c.risk_score < 0.7).length;
  const atRiskMrr = customers
    .filter(c => c.risk_score >= 0.7)
    .reduce((sum, c) => sum + c.subscription_value, 0);

  if (loading) return <div className="text-gray-400 p-8">Loading risk alerts...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Risk Alerts</h2>
        <p className="text-gray-400 text-sm mt-1">Active customers flagged for churn risk</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-300 text-sm">High Risk</span>
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white">{high}</p>
          <p className="text-red-400 text-xs mt-1">Risk score ≥ 70%</p>
        </div>
        <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-300 text-sm">Medium Risk</span>
            <TrendingDown size={18} className="text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white">{medium}</p>
          <p className="text-yellow-400 text-xs mt-1">Risk score 40–70%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">MRR at Risk</span>
            <DollarSign size={18} className="text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">${atRiskMrr.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">From high-risk customers</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'high', 'medium'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All At-Risk' : f === 'high' ? 'High Risk' : 'Medium Risk'}
          </button>
        ))}
        <span className="ml-auto text-gray-500 text-sm self-center">{filtered.length} customers</span>
      </div>

      {/* Customer Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3">Customer</th>
              <th className="text-left px-5 py-3">Plan</th>
              <th className="text-left px-5 py-3">Industry</th>
              <th className="text-left px-5 py-3">Last Login</th>
              <th className="text-left px-5 py-3">Usage hrs</th>
              <th className="text-left px-5 py-3">Tickets</th>
              <th className="text-left px-5 py-3">Sentiment</th>
              <th className="text-left px-5 py-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.customer_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-gray-500 text-xs">{c.customer_id}</p>
                </td>
                <td className="px-5 py-3 text-gray-300">{c.plan_type}</td>
                <td className="px-5 py-3 text-gray-400">{c.industry}</td>
                <td className="px-5 py-3 text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  {c.last_login}
                </td>
                <td className="px-5 py-3 text-gray-300">{c.usage_hours}h</td>
                <td className="px-5 py-3">
                  <span className={c.support_tickets >= 5 ? 'text-red-400' : 'text-gray-300'}>
                    {c.support_tickets}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="w-20 bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        c.sentiment_score >= 0.6 ? 'bg-green-500' :
                        c.sentiment_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${c.sentiment_score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{(c.sentiment_score * 100).toFixed(0)}%</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    c.risk_score >= 0.7 ? 'bg-red-900/60 text-red-300' : 'bg-yellow-900/60 text-yellow-300'
                  }`}>
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