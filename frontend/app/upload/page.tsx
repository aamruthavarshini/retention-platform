'use client';
import { useState } from 'react';
import { previewCSV, validateCSV, importCSV, downloadTemplate } from '@/lib/api';
import { Upload, Download, FileText, ChevronRight, CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

const OUR_FIELDS = [
  { key: 'name', label: 'Customer Name', required: true },
  { key: 'email', label: 'Email Address', required: true },
  { key: 'customer_id', label: 'Customer ID', required: false },
  { key: 'plan_type', label: 'Plan / Tier', required: false },
  { key: 'subscription_value', label: 'MRR / Subscription Value', required: false },
  { key: 'join_date', label: 'Join Date', required: false },
  { key: 'last_login', label: 'Last Login / Activity Date', required: false },
  { key: 'usage_hours', label: 'Usage Hours', required: false },
  { key: 'support_tickets', label: 'Support Tickets', required: false },
  { key: 'sentiment_score', label: 'Sentiment Score (auto-calculated if missing)', required: false },
  { key: 'risk_score', label: 'Risk Score (auto-calculated if missing)', required: false },
  { key: 'status', label: 'Status (Active/Cancelled)', required: false },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'company_size', label: 'Company Size', required: false },
];

export default function UploadPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);
      const res = await previewCSV(formData);
      setHeaders(res.headers);
      setPreview(res.preview);
      const autoMapping: Record<string, string> = {};
      for (const field of OUR_FIELDS) {
        const match = res.headers.find((h: string) =>
          h.toLowerCase().replace(/[\s_-]/g, '') ===
          field.key.toLowerCase().replace(/[\s_-]/g, '')
        );
        if (match) autoMapping[field.key] = match;
      }
      setMapping(autoMapping);
      setStep('mapping');
    } catch {
      setError('Failed to parse CSV. Make sure it is a valid CSV file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!file) return;
    setValidating(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      const res = await validateCSV(formData);
      setValidation(res);
      setStep('validation');
    } catch {
      setError('Validation failed. Please try again.');
    } finally {
      setValidating(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      const res = await importCSV(formData);
      setImportResult(res);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    const blob = await downloadTemplate();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_template.csv';
    a.click();
  }

  const steps = ['upload', 'mapping', 'validation', 'success'] as const;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Import Customer Data</h2>
        <p className="text-gray-400 text-sm mt-1">Upload your customer CSV and map your columns to our fields</p>
      </div>

      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              step === s ? 'bg-indigo-600 text-white' :
              steps.indexOf(step) > i ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-500'
            }`}>
              {i + 1}. {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : s === 'validation' ? 'Validate' : 'Done'}
            </div>
            {i < 3 && <ChevronRight size={14} className="text-gray-600" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Download CSV Template</p>
              <p className="text-gray-400 text-sm mt-1">See the ideal format — but any CSV will work</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} /> Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl p-12 text-center transition-colors">
            <Upload size={32} className="mx-auto mb-3 text-gray-500" />
            <p className="text-gray-300 mb-1">Upload your customer CSV</p>
            <p className="text-gray-500 text-sm mb-4">Any format works — you will map the columns next</p>
            {loading ? (
              <p className="text-indigo-400 text-sm">Parsing CSV...</p>
            ) : (
              <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                Choose CSV File
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg p-4">
              <AlertCircle size={16} />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-1">Map Your Columns</h3>
            <p className="text-gray-400 text-sm">We auto-matched what we could. Fix any that are wrong.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Our Field</th>
                  <th className="text-left px-5 py-3">Your Column</th>
                  <th className="text-left px-5 py-3">Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {OUR_FIELDS.map(field => (
                  <tr key={field.key} className="border-b border-gray-800/50">
                    <td className="px-5 py-3">
                      <p className="text-white text-sm">{field.label}</p>
                      {field.required
                        ? <span className="text-red-400 text-xs">Required</span>
                        : <span className="text-gray-600 text-xs">Optional</span>}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={mapping[field.key] || ''}
                        onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-indigo-500 w-full"
                      >
                        <option value="">— skip this field —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono">
                      {mapping[field.key] && preview[0]
                        ? String(preview[0][mapping[field.key]] || '—')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText size={14} /> Preview — first {preview.length} rows
            </h4>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-gray-500">
                    {headers.map(h => (
                      <th key={h} className="text-left px-3 py-2 border-b border-gray-800">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      {headers.map(h => (
                        <td key={h} className="px-3 py-2 text-gray-400">{row[h] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setFile(null); }}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleValidate}
              disabled={validating || !mapping.name}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {validating ? 'Validating...' : 'Validate Data'}
            </button>
          </div>
        </div>
      )}

      {step === 'validation' && validation && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Total Rows</p>
              <p className="text-2xl font-bold text-white mt-1">{validation.total}</p>
            </div>
            <div className={`rounded-xl p-4 border ${
              validation.errorCount === 0
                ? 'bg-green-950/30 border-green-800/50'
                : 'bg-red-950/30 border-red-800/50'
            }`}>
              <p className="text-gray-400 text-sm">Errors</p>
              <p className={`text-2xl font-bold mt-1 ${validation.errorCount === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {validation.errorCount}
              </p>
            </div>
            <div className={`rounded-xl p-4 border ${
              validation.warningCount === 0
                ? 'bg-gray-900 border-gray-800'
                : 'bg-yellow-950/30 border-yellow-800/50'
            }`}>
              <p className="text-gray-400 text-sm">Warnings</p>
              <p className={`text-2xl font-bold mt-1 ${validation.warningCount === 0 ? 'text-white' : 'text-yellow-400'}`}>
                {validation.warningCount}
              </p>
            </div>
          </div>

          {validation.canImport ? (
            <div className="flex items-center gap-3 bg-green-950/30 border border-green-800/50 rounded-xl p-4">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-300 font-medium">Ready to import</p>
                <p className="text-gray-400 text-sm">{validation.validRows} customers will be imported successfully</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/50 rounded-xl p-4">
              <XCircle size={20} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-medium">Cannot import — fix errors first</p>
                <p className="text-gray-400 text-sm">Go back and fix the issues below, then validate again</p>
              </div>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="bg-gray-900 border border-red-800/30 rounded-xl p-5">
              <h4 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <XCircle size={14} /> Errors — must fix before importing
              </h4>
              <div className="space-y-2">
                {validation.errors.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-red-300">{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="bg-gray-900 border border-yellow-800/30 rounded-xl p-5">
              <h4 className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Warnings — import will still work
              </h4>
              <div className="space-y-2">
                {validation.warnings.map((w: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                    <span className="text-yellow-300">{w.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('mapping')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !validation.canImport}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${validation.validRows} Customers`}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-4">
          <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
            <h3 className="text-white text-xl font-bold mb-2">Import Successful!</h3>
            <p className="text-green-300">{importResult?.message}</p>
            <p className="text-gray-400 text-sm mt-2">All pages now reflect your imported customer data.</p>
          </div>

          {importResult?.autoCalculated && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h4 className="text-white font-semibold mb-3">Fields Auto-Calculated</h4>
              <div className="grid grid-cols-2 gap-3">
                {importResult.autoCalculated.risk_score > 0 && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">Risk Score</p>
                    <p className="text-gray-400 text-xs mt-1">Calculated from usage, tickets and last login</p>
                    <p className="text-indigo-400 text-xs mt-1">Applied to {importResult.autoCalculated.risk_score} customers</p>
                  </div>
                )}
                {importResult.autoCalculated.sentiment_score > 0 && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">Sentiment Score</p>
                    <p className="text-gray-400 text-xs mt-1">Calculated from ticket volume and risk score</p>
                    <p className="text-indigo-400 text-xs mt-1">Applied to {importResult.autoCalculated.sentiment_score} customers</p>
                  </div>
                )}
                {importResult.autoCalculated.status > 0 && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">Customer Status</p>
                    <p className="text-gray-400 text-xs mt-1">Inferred from risk score and last login</p>
                    <p className="text-indigo-400 text-xs mt-1">Applied to {importResult.autoCalculated.status} customers</p>
                  </div>
                )}
                {importResult.autoCalculated.customer_id > 0 && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">Customer IDs</p>
                    <p className="text-gray-400 text-xs mt-1">Auto-generated unique IDs</p>
                    <p className="text-indigo-400 text-xs mt-1">Applied to {importResult.autoCalculated.customer_id} customers</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => { setStep('upload'); setFile(null); setImportResult(null); setValidation(null); }}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}