'use client';
import { useEffect, useState } from 'react';
import { getCustomers, generateForensicsReport } from '@/lib/api';
import { FileSearch, TrendingDown, Clock, AlertTriangle } from 'lucide-react';

export default function ChurnForensics() {
  const [cancelled, setCancelled] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [aiReport, setAiReport] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    getCustomers({ status: 'Cancelled' }).then(data => {
      setCancelled(data);
      setLoading(false);
    });
  }, []);

  const filtered = cancelled.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(search.toLowerCase())
  );

  function getPrimaryCause(c: any) {
    if (c.support_tickets >= 7) return 'Poor Support Experience';
    if (c.usage_hours < 2) return 'Low Product Adoption';
    if (c.sentiment_score < 0.25) return 'Negative Sentiment Trend';
    if (c.usage_hours < 5) return 'Insufficient Onboarding';
    return 'Competitive Displacement';
  }

  function getContributingFactors(c: any) {
    const factors = [];
    if (c.usage_hours < 5) factors.push('Low usage hours');
    if (c.support_tickets >= 5) factors.push('High support ticket volume');
    if (c.sentiment_score < 0.35) factors.push('Declining sentiment score');
    if (c.support_tickets >= 3) factors.push('Unresolved friction points');
    factors.push('No retention action taken before cancellation');
    return factors;
  }

  function getRecommendations(cause: string) {
    const map: Record<string, string[]> = {
      'Poor Support Experience': [
        'Improve first-response SLA to under 2 hours',
        'Assign dedicated CSM for Enterprise accounts',
        'Implement proactive health check calls',
      ],
      'Low Product Adoption': [
        'Redesign onboarding flow with guided tooltips',
        'Trigger feature discovery emails at day 7 and 14',
        'Offer free onboarding session for new accounts',
      ],
      'Negative Sentiment Trend': [
        'Deploy NPS survey at 30-day mark',
        'Flag accounts below 40% sentiment for CSM review',
        'Build automated re-engagement sequence',
      ],
      'Insufficient Onboarding': [
        'Create role-based onboarding checklists',
        'Add in-app progress tracking',
        'Schedule kickoff call within 48 hours of signup',
      ],
      'Competitive Displacement': [
        'Conduct win/loss analysis for churned accounts',
        'Build competitive battle cards for sales team',
        'Offer loyalty discount at renewal for at-risk accounts',
      ],
    };
    return map[cause] || [];
  }

  const lostMrr = cancelled.reduce((sum, c) => sum + c.subscription_value, 0);
  const avgSentiment = cancelled.length
    ? (cancelled.reduce((sum, c) => sum + c.sentiment_score, 0) / cancelled.length).toFixed(2)
    : 0;
  const avgTickets = cancelled.length
    ? (cancelled.reduce((sum, c) => sum + c.support_tickets, 0) / cancelled.length).toFixed(1)
    : 0;

  if (loading) return <div className="text-gray-400 p-8">Loading forensics data...</div>;

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      {/* Left Panel */}
      <div className="w-72 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold mb-1">Churn Forensics</h2>
          <p className="text-gray-500 text-xs mb-3">{cancelled.length} cancelled accounts</p>
          <input
            type="text"
            placeholder="Search cancelled..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Summary Stats */}
        <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-2">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Lost MRR</p>
            <p className="text-red-400 font-bold text-sm mt-0.5">${lostMrr.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Avg Sentiment</p>
            <p className="text-yellow-400 font-bold text-sm mt-0.5">{avgSentiment}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 col-span-2">
            <p className="text-gray-500 text-xs">Avg Support Tickets</p>
            <p className="text-orange-400 font-bold text-sm mt-0.5">{avgTickets} tickets/customer</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.customer_id}
              onClick={() => { setSelected(c); setAiReport(''); }}
              className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${
                selected?.customer_id === c.customer_id ? 'bg-red-900/20 border-l-2 border-l-red-500' : ''
              }`}
            >
              <p className="text-white text-sm font-medium">{c.name}</p>
              <p className="text-gray-500 text-xs">{c.customer_id} · {c.plan_type}</p>
              <p className="text-red-400 text-xs mt-0.5">Lost ${c.subscription_value}/mo</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto space-y-4" style={{ height: 'calc(100vh - 96px)' }}>
        {!selected ? (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <FileSearch size={48} className="mx-auto mb-3 opacity-30" />
              <p>Select a cancelled account to run forensics</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{selected.name}</h3>
                  <p className="text-gray-400 text-sm">{selected.email}</p>
                  <p className="text-gray-500 text-xs mt-1">{selected.customer_id} · {selected.industry} · {selected.plan_type}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-900/50 text-red-300">
                  Cancelled
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'MRR Lost', value: `$${selected.subscription_value}/mo`, color: 'text-red-400' },
                  { label: 'Usage Hours', value: `${selected.usage_hours}h`, color: 'text-yellow-400' },
                  { label: 'Support Tickets', value: selected.support_tickets, color: 'text-orange-400' },
                  { label: 'Last Login', value: selected.last_login, color: 'text-gray-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className={`font-semibold mt-1 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Report Button */}
            <button
              onClick={async () => {
                setAiLoading(true);
                setAiReport('');
                const res = await generateForensicsReport(selected.customer_id);
                setAiReport(res.report);
                setAiLoading(false);
              }}
              disabled={aiLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {aiLoading ? 'Generating AI Report...' : '✨ Generate AI Forensics Report'}
            </button>

            {/* AI Report Output */}
            {aiReport && (
              <div className="bg-gray-900 border border-indigo-800/50 rounded-xl p-5">
                <h4 className="text-indigo-300 font-semibold text-sm mb-3">✨ AI Forensics Report</h4>
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{aiReport}</p>
              </div>
            )}

            {/* Primary Cause */}
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-400" />
                <h4 className="text-red-300 font-semibold text-sm">Primary Cause of Churn</h4>
              </div>
              <p className="text-white text-lg font-bold">{getPrimaryCause(selected)}</p>
              <div className="mt-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Contributing Factors</p>
                <ul className="space-y-1.5">
                  {getContributingFactors(selected).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sentiment + Risk */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <TrendingDown size={14} /> Health Signals at Cancellation
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Sentiment Score</span>
                    <span className="text-red-400">{(selected.sentiment_score * 100).toFixed(0)}% — Very Low</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${selected.sentiment_score * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Risk Score at Cancellation</span>
                    <span className="text-red-400">{(selected.risk_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-orange-500" style={{ width: `${selected.risk_score * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Product Usage</span>
                    <span className="text-yellow-400">{selected.usage_hours}h total</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-yellow-500" style={{ width: `${Math.min(selected.usage_hours / 60 * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-indigo-400" />
                <h4 className="text-indigo-300 font-semibold text-sm">Recommendations to Prevent Future Churn</h4>
              </div>
              <ul className="space-y-2">
                {getRecommendations(getPrimaryCause(selected)).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}