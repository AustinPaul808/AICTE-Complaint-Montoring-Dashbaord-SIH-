import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { sendContactEmail } from '../../services/email/brevoClient';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  defaultName = '',
}) => {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Spam honeypot trap

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!message.trim()) {
      setErrorMessage('Please provide your message.');
      return;
    }

    setIsLoading(true);
    try {
      await sendContactEmail({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim() || 'General Inquiry',
        message: message.trim(),
        _honeypot: honeypot,
      });

      setSuccess(true);
      setMessage('');
      setSubject('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e?.message || 'Failed to dispatch email. Please check server configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-300 overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-[#0b3b60] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#f47920]">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-sm font-bold tracking-wide">Contact Portal Administration</h3>
              <p className="text-[11px] text-blue-100">AICTE Helpdesk &amp; Regulatory Inquiries</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Message Dispatched Successfully</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Your inquiry has been securely transmitted to the portal administration via Brevo Transactional Service. A confirmation copy will be directed to <strong>{email}</strong>.
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-4 px-6 py-2 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-xs transition"
            >
              Done / Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Hidden Bot Honeypot */}
            <input
              type="text"
              name="_honeypot"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official / Contact Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul.sharma@example.com"
                required
                className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Inquiring regarding fee violation timeline"
                className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Detailed Message <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your inquiry or feedback message..."
                required
                className="w-full border border-slate-300 rounded p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <span className="text-[10px] text-slate-400">
                🔒 Secured with server-side Brevo SMTP
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  disabled={isLoading}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#0b3b60] hover:bg-[#072a45] text-white rounded font-bold shadow-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Inquiry</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
