'use client';

import { useState } from 'react';
import api from '@/lib/axios';
import { LABELS } from '@/lib/labels';

interface GemTransaction {
  id: string;
  gems: number;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface GemWalletWidgetProps {
  balance: number;
  hasBillingContact: boolean;
  transactions?: GemTransaction[];
}

export default function GemWalletWidget({
  balance,
  hasBillingContact,
  transactions,
}: GemWalletWidgetProps) {
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState(100);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequest = async () => {
    setRequesting(true);
    setError('');
    setMessage('');
    try {
      await api.post('/gems/request-topup', { amount });
      setMessage(
        'Request sent! Your billing contact will receive an email with a payment link.',
      );
      setShowForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to send request.'),
      );
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            {LABELS.STUDENT_GEMS.theme}
          </p>
          <h3 className="text-white font-semibold">{LABELS.STUDENT_GEMS.primary}</h3>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <span className="text-amber-400 text-xl">✦</span>
          <span className="text-amber-400 text-2xl font-bold">{balance}</span>
        </div>
      </div>

      {message && (
        <p className="text-green-400 text-sm mb-3 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {hasBillingContact ? (
        showForm ? (
          <div className="space-y-3">
            <div>
              <label
                className="block text-xs text-gray-400 mb-1.5"
                htmlFor="gem-amount"
              >
                How many gems?
              </label>
              <div className="flex items-center gap-2">
                {[50, 100, 200, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      amount === v
                        ? 'bg-amber-500 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {requesting ? 'Sending…' : `Request ${amount} Gems`}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-600 text-gray-400 rounded-lg text-sm hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border border-teal-500 text-teal-400 hover:bg-teal-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {LABELS.STUDENT_REQUEST_TOPUP.primary}
          </button>
        )
      ) : (
        <p className="text-gray-500 text-xs">
          Gem top-ups require a billing contact. Contact support to add one.
        </p>
      )}

      {/* Recent transactions */}
      {transactions && transactions.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
            Recent Transactions
          </p>
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-700/30"
              >
                <div>
                  <p className="text-sm text-white font-medium">
                    +{tx.gems} gems
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {tx.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tx.status === 'COMPLETED'
                      ? 'bg-green-500/20 text-green-400'
                      : tx.status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
