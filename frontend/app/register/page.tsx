'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!form.name || !form.email || !form.password || !form.companyName) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:4000/api/auth/register', form);
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 text-sm mt-1">Set up RetainIQ for your company</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1.5">Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
              placeholder="Acme Corp"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1.5">Your Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="John Smith"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="john@acme.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Min 8 characters"
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-gray-500 text-sm text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}