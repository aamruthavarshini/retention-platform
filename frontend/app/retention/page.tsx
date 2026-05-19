'use client';
import { useEffect, useState } from 'react';
import { getRetentionActions, updateRetentionAction, generateRetentionEmail, sendRetentionEmail } from '@/lib/api';
import { Zap, CheckCircle, XCircle, Send } from 'lucide-react';

export default function RetentionAssistant() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [emailModal, setEmailModal] = useState<{id: string, name: string, email: string} | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getRetentionActions({}).then(data => {
      setActions(data);
      setLoading(false);
    });
  }, []);

  function updateStatus(id: number, status: string) {
    updateRetentionAction(id, { status }).then(() => {
      setActions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    });
  }

  async function openEmailModal(a: any) {
    setEmailModal({ id: a.customer_id, name: a.customer_name, email: a.email });
    setEmailLoading(true);
    setGeneratedEmail('');
    setCopied(false);
    setSent(false);
    const res = await generateRetentionEmail(a.customer_id);
    setGeneratedEmail(res.email);
    setEmailLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendEmail() {
    if (!emailModal) return;
    setSending(true);
    try {
      await sendRetentionEmail(emailModal.email, emailModal.name, generatedEmail);
      setSent(true);
      setTimeout(() => setEmailModal(null), 1500);
    } catch (err) {
      alert('Failed to send email. Check your Resend API key.');
    } finally {
      setSending(false);
    }
  }

  const filtered = actions.filter(a => filter === 'all' ? true : a.status === filter);

  const counts = {
    Pending: actions.filter(a => a.status === 'Pending').length,
    Approved: actions.filter(a => a.status === 'Approved').length,
    Sent: actions.filter(a => a.status === 'Sent').length,
    Completed: actions.filter(a => a.status === 'Completed').length,
  };

  if (loading) return <div className="text-gray-400 p-8">Loading retention actions...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Retention Assistant</h2>
        <p className="text-gray-400 text-sm mt-1">Review and action AI-suggested retention interventions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'Pending', 'Approved', 'Sent', 'Completed', 'Dismissed'].map(f => (
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
        <span className="ml-auto text-gray-500 text-sm self-center">{filtered.length} actions</span>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-indigo-400" />
                  <span className="text-white font-medium">{a.customer_name}</span>
                  <span className="text-gray-500 text-xs">{a.email}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                    a.risk_score >= 0.7 ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    Risk {(a.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-300 text-sm mt-2">{a.suggestion}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-500 text-xs">{a.plan_type}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{a.action_type}</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{a.created_at.split('T')[0]}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                {a.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(a.id, 'Approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-900/70 text-green-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, 'Dismissed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <XCircle size={13} /> Dismiss
                    </button>
                  </>
                )}
                {a.status === 'Approved' && (
                  <button
                    onClick={() => updateStatus(a.id, 'Sent')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Send size={13} /> Mark Sent
                  </button>
                )}
                {a.status === 'Sent' && (
                  <button
                    onClick={() => updateStatus(a.id, 'Completed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <CheckCircle size={13} /> Complete
                  </button>
                )}
                {(a.status === 'Completed' || a.status === 'Dismissed') && (
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    a.status === 'Completed' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {a.status}
                  </span>
                )}
                <button
                  onClick={() => openEmailModal(a)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                >
                  ✨ Draft Email
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">AI Drafted Email</h3>
                <p className="text-gray-500 text-xs mt-0.5">For {emailModal.name} · {emailModal.email}</p>
              </div>
              <button
                onClick={() => setEmailModal(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {emailLoading ? (
              <div className="text-gray-400 text-sm py-12 text-center">
                <div className="mb-2">✨ Generating personalised email...</div>
                <div className="text-gray-600 text-xs">Analysing customer data</div>
              </div>
            ) : (
              <>
                <textarea
                  value={generatedEmail}
                  onChange={e => setGeneratedEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-300 text-sm h-64 outline-none resize-none focus:border-indigo-500"
                />
                <p className="text-gray-600 text-xs mt-2">You can edit the email before sending</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCopy}
                    className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sending || sent}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {sent ? '✓ Email Sent!' : sending ? 'Sending...' : 'Send Email'}
                  </button>
                  <button
                    onClick={() => setEmailModal(null)}
                    className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}