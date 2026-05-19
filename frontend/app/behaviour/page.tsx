 
'use client';
import { useEffect, useState } from 'react';
import { getCustomers, getCustomer } from '@/lib/api';
import { Activity, Clock, Tag, ChevronRight } from 'lucide-react';

export default function BehaviourExplorer() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getCustomers({}).then(data => {
      setCustomers(data);
      setLoading(false);
    });
  }, []);

  function selectCustomer(c: any) {
    setSelected(c);
    setDetailLoading(true);
    getCustomer(c.customer_id).then(data => {
      setDetail(data);
      setDetailLoading(false);
    });
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const eventColors: Record<string, string> = {
    login: 'bg-blue-500',
    logout: 'bg-gray-500',
    feature_used: 'bg-indigo-500',
    support_ticket_opened: 'bg-red-500',
    support_ticket_closed: 'bg-green-500',
    payment_made: 'bg-emerald-500',
    report_generated: 'bg-purple-500',
    export_data: 'bg-cyan-500',
    upgrade_viewed: 'bg-yellow-500',
    integration_added: 'bg-pink-500',
    user_invited: 'bg-teal-500',
    dashboard_viewed: 'bg-blue-400',
    api_called: 'bg-orange-500',
    settings_changed: 'bg-gray-400',
  };

  if (loading) return <div className="text-gray-400 p-8">Loading customers...</div>;

  return (
    <div className="flex gap-4 h-full max-w-7xl mx-auto">
      {/* Left Panel — Customer List */}
      <div className="w-72 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold mb-3">Behaviour Explorer</h2>
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.customer_id}
              onClick={() => selectCustomer(c)}
              className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors flex items-center justify-between ${
                selected?.customer_id === c.customer_id ? 'bg-indigo-600/20 border-l-2 border-l-indigo-500' : ''
              }`}
            >
              <div>
                <p className="text-white text-sm font-medium">{c.name}</p>
                <p className="text-gray-500 text-xs">{c.customer_id} · {c.plan_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                <ChevronRight size={14} className="text-gray-600" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel — Customer Detail */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {!selected && (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Activity size={48} className="mx-auto mb-3 opacity-30" />
              <p>Select a customer to explore their behaviour</p>
            </div>
          </div>
        )}

        {selected && detailLoading && (
          <div className="text-gray-400 p-8">Loading customer detail...</div>
        )}

        {selected && detail && !detailLoading && (
          <>
            {/* Customer Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{detail.customer.name}</h3>
                  <p className="text-gray-400 text-sm">{detail.customer.email}</p>
                  <p className="text-gray-500 text-xs mt-1">{detail.customer.customer_id} · {detail.customer.industry} · {detail.customer.company_size} employees</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  detail.customer.status === 'Active' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                }`}>
                  {detail.customer.status}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-4 mt-5">
                {[
                  { label: 'Plan', value: detail.customer.plan_type },
                  { label: 'MRR', value: `$${detail.customer.subscription_value}` },
                  { label: 'Usage', value: `${detail.customer.usage_hours}h` },
                  { label: 'Tickets', value: detail.customer.support_tickets },
                  { label: 'Joined', value: detail.customer.join_date },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="text-white font-semibold mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Risk + Sentiment bars */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Risk Score</span>
                    <span className="text-red-400">{(detail.customer.risk_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${detail.customer.risk_score * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Sentiment</span>
                    <span className="text-green-400">{(detail.customer.sentiment_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${detail.customer.sentiment_score * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Clock size={14} /> Activity Timeline (last 20 events)
              </h4>
              <div className="space-y-3">
                {detail.activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${eventColors[a.event_type] || 'bg-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{a.event_description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-600 text-xs">{a.event_date}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${eventColors[a.event_type] || 'bg-gray-700'} bg-opacity-20 text-gray-400`}>
                          {a.event_type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention Actions */}
            {detail.actions.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Tag size={14} /> Retention Actions
                </h4>
                <div className="space-y-3">
                  {detail.actions.map((a: any) => (
                    <div key={a.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-white text-sm">{a.suggestion}</p>
                        <span className={`ml-3 px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${
                          a.status === 'Sent' ? 'bg-blue-900/50 text-blue-300' :
                          a.status === 'Approved' ? 'bg-green-900/50 text-green-300' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">{a.action_type} · {a.created_at.split('T')[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}