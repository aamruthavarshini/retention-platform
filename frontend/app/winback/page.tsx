'use client';
import { useEffect, useState } from 'react';
import { getWinbackCampaigns, addWinbackCampaign, updateWinbackCampaign, deleteWinbackCampaign, getCustomers } from '@/lib/api';
import { Target, Plus, X, CheckCircle, Clock, PhoneCall, Mail, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'bg-blue-900/50 text-blue-300',
  'Won Back': 'bg-green-900/50 text-green-300',
  'Lost': 'bg-red-900/50 text-red-300',
  'On Hold': 'bg-yellow-900/50 text-yellow-300',
};

const OUTCOME_OPTIONS = ['Still considering', 'Switched to competitor', 'Budget issues', 'Feature gap', 'Won back - full plan', 'Won back - downgraded', 'Unresponsive'];

export default function WinbackPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [cancelledCustomers, setCancelledCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      getWinbackCampaigns(),
      getCustomers({ status: 'Cancelled' })
    ]).then(([camps, customers]) => {
      setCampaigns(camps);
      setCancelledCustomers(customers);
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    if (!selectedCustomer) return;
    setAdding(true);
    const customer = cancelledCustomers.find(c => c.customer_id === selectedCustomer);
    if (!customer) return;
    try {
      await addWinbackCampaign({
        customer_id: customer.customer_id,
        customer_name: customer.name,
        email: customer.email,
        plan_type: customer.plan_type,
        subscription_value: customer.subscription_value,
        cancellation_reason: cancellationReason,
      });
      const updated = await getWinbackCampaigns();
      setCampaigns(updated);
      setShowAddModal(false);
      setSelectedCustomer('');
      setCancellationReason('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add campaign');
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: number, data: any) {
    await updateWinbackCampaign(id, data);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this campaign?')) return;
    await deleteWinbackCampaign(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }

  const filtered = campaigns.filter(c => filter === 'all' ? true : c.status === filter);

  const stats = {
    total: campaigns.length,
    inProgress: campaigns.filter(c => c.status === 'In Progress').length,
    wonBack: campaigns.filter(c => c.status === 'Won Back').length,
    lost: campaigns.filter(c => c.status === 'Lost').length,
    potentialMrr: campaigns.filter(c => c.status !== 'Lost').reduce((s, c) => s + c.subscription_value, 0),
  };

  if (loading) return <div className="text-gray-400 p-8">Loading winback campaigns...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-indigo-400" />
            Win-back Tracker
          </h2>
          <p className="text-gray-400 text-sm mt-1">Track outreach to cancelled customers you want to recover</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Campaigns', value: stats.inProgress, color: 'text-blue-400' },
          { label: 'Won Back', value: stats.wonBack, color: 'text-green-400' },
          { label: 'Lost', value: stats.lost, color: 'text-red-400' },
          { label: 'Potential MRR', value: `$${stats.potentialMrr.toLocaleString()}`, color: 'text-indigo-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'In Progress', 'Won Back', 'On Hold', 'Lost'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <span className="ml-auto text-gray-500 text-sm self-center">{filtered.length} campaigns</span>
      </div>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Target size={48} className="mx-auto mb-3 opacity-30" />
          <p>No campaigns yet. Add a cancelled customer to start tracking!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-white font-semibold">{c.customer_name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-800 text-gray-400'}`}>
                      {c.status}
                    </span>
                    <span className="text-gray-500 text-xs ml-auto">
                      {c.outreach_count} outreach attempt{c.outreach_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                    <span>{c.email}</span>
                    <span className="text-gray-600">·</span>
                    <span>{c.plan_type}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-green-400">${c.subscription_value}/mo</span>
                    {c.last_contact_date && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> Last contact: {c.last_contact_date}
                        </span>
                      </>
                    )}
                    {c.next_followup_date && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Clock size={10} /> Follow up: {c.next_followup_date}
                        </span>
                      </>
                    )}
                  </div>

                  {c.cancellation_reason && (
                    <p className="text-gray-500 text-xs mb-2">Reason: {c.cancellation_reason}</p>
                  )}
                  {c.notes && (
                    <p className="text-gray-300 text-sm bg-gray-800 rounded-lg px-3 py-2">{c.notes}</p>
                  )}
                  {c.outcome && (
                    <p className="text-indigo-300 text-xs mt-2">Outcome: {c.outcome}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowEditModal(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <PhoneCall size={12} /> Update
                  </button>
                  {c.status !== 'Won Back' && (
                    <button
                      onClick={() => handleUpdate(c.id, { status: 'Won Back', outreach_count: c.outreach_count + 1 })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-900/70 text-green-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      <CheckCircle size={12} /> Won Back!
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-300 rounded-lg text-xs transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add Win-back Campaign</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Select Cancelled Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">— choose a customer —</option>
                  {cancelledCustomers
                    .filter(c => !campaigns.find(camp => camp.customer_id === c.customer_id))
                    .map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.name} — {c.plan_type} (${c.subscription_value}/mo)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Cancellation Reason (optional)</label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="e.g. Too expensive, missing features..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !selectedCustomer}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Campaign'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">Update Campaign</h3>
                <p className="text-gray-400 text-xs mt-0.5">{showEditModal.customer_name}</p>
              </div>
              <button onClick={() => setShowEditModal(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Status</label>
                <select
                  defaultValue={showEditModal.status}
                  onChange={e => setShowEditModal((p: any) => ({ ...p, status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                >
                  {['In Progress', 'Won Back', 'On Hold', 'Lost'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Notes from last outreach</label>
                <textarea
                  defaultValue={showEditModal.notes || ''}
                  onChange={e => setShowEditModal((p: any) => ({ ...p, notes: e.target.value }))}
                  placeholder="What happened on the last call or email?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1.5">Last Contact Date</label>
                  <input
                    type="date"
                    defaultValue={showEditModal.last_contact_date || ''}
                    onChange={e => setShowEditModal((p: any) => ({ ...p, last_contact_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1.5">Next Follow-up</label>
                  <input
                    type="date"
                    defaultValue={showEditModal.next_followup_date || ''}
                    onChange={e => setShowEditModal((p: any) => ({ ...p, next_followup_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Outcome</label>
                <select
                  defaultValue={showEditModal.outcome || ''}
                  onChange={e => setShowEditModal((p: any) => ({ ...p, outcome: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">— select outcome —</option>
                  {OUTCOME_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await handleUpdate(showEditModal.id, {
                      status: showEditModal.status,
                      notes: showEditModal.notes,
                      last_contact_date: showEditModal.last_contact_date,
                      next_followup_date: showEditModal.next_followup_date,
                      outcome: showEditModal.outcome,
                      outreach_count: (showEditModal.outreach_count || 0) + 1,
                    });
                    setShowEditModal(null);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Update
                </button>
                <button
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}