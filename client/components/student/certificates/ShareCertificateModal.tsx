'use client';

// "Share your achievement": the ready-written message plus every way to send it.
//
//   • Share…      — the device's own share sheet (Web Share API), with the image
//                   attached where the browser allows it. Shown only when supported.
//   • WhatsApp / Facebook / LinkedIn — each platform's real share link.
//   • Discord     — has no share link, so we copy the message and open Discord.
//   • Instagram   — a website cannot post there: we save the image and explain
//                   the manual upload. No direct posting is promised.
//   • Copy link / Copy message / Download image — always available.
//
// The link shared is the server-built verification URL (from FRONTEND_URL). With
// none configured there is nothing to share, and the dialog says so rather than
// inventing an address. Everything that opens a window or copies is done directly
// in the tap handler so browsers allow it.

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Copy, Download, Gamepad2, Link2, MessageCircle, Share2, X } from 'lucide-react';
import { useModalBehavior } from '@/components/student/useModalBehavior';
import { fetchBlob, studentCertificates } from '@/lib/certificates/api';
import { saveBlob } from '@/lib/certificates/files';
import { certificateFileName } from '@/lib/certificates/format';
import {
  DISCORD_OPEN_URL,
  INSTAGRAM_NOTE,
  INSTAGRAM_STEPS,
  buildShareMessage,
  buildShareMessageWithoutLink,
  canShareNatively,
  copyText,
  facebookShareUrl,
  legacyCopyViaTextarea,
  linkedinShareUrl,
  shareNatively,
  whatsappShareUrl,
} from '@/lib/certificates/share';
import type { StudentCertificate } from '@/lib/certificates/types';

type Notice = { text: string; tone: 'ok' | 'error' };

function Option({
  label,
  chip,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  chip: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white dark:hover:bg-gray-800"
    >
      {chip}
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}

const chip = (bg: string, content: ReactNode) => (
  <span
    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
    style={{ background: bg }}
    aria-hidden
  >
    {content}
  </span>
);

export default function ShareCertificateModal({
  cert,
  onClose,
}: {
  cert: StudentCertificate;
  onClose: () => void;
}) {
  const panelRef = useModalBehavior(onClose);
  const link = cert.verificationUrl;
  const message = link ? buildShareMessage(cert.programName, link) : '';
  const fileName = certificateFileName(cert.certificateId, 'png');

  const [notice, setNotice] = useState<Notice | null>(null);
  const [showInstagram, setShowInstagram] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  // This dialog only ever renders in response to a tap, i.e. in the browser (it
  // portals into document.body), so `navigator` is always there.
  const native = canShareNatively(navigator);

  // Fetch the image up front: the share sheet must open straight from the tap,
  // and cannot wait for a download.
  useEffect(() => {
    if (!cert.hasImage) return;
    let alive = true;
    fetchBlob(studentCertificates.filePath(cert.certificateId, 'png'))
      .then((blob) => {
        if (alive) setImageFile(new File([blob], fileName, { type: 'image/png' }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cert.certificateId, cert.hasImage, fileName]);

  const say = (text: string, tone: Notice['tone'] = 'ok') => setNotice({ text, tone });
  const openTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const copy = (text: string) => copyText(text, navigator, legacyCopyViaTextarea);

  const saveImage = async (): Promise<boolean> => {
    try {
      const blob = imageFile ?? (await fetchBlob(studentCertificates.filePath(cert.certificateId, 'png')));
      saveBlob(blob, fileName);
      return true;
    } catch {
      say('The download did not work. Please try again in a moment.', 'error');
      return false;
    }
  };

  const shareNative = async () => {
    const result = await shareNatively(navigator, {
      title: `My Lumexa certificate — ${cert.programName}`,
      text: message,
      file: imageFile,
    });
    if (result === 'shared') say('Shared! 🎉');
    else if (result === 'failed') say('Sharing did not work on this device. Try one of the options below.', 'error');
    // 'cancelled': the person closed the share sheet — nothing to say.
  };

  const shareWhatsApp = () => {
    openTab(whatsappShareUrl(message));
    say('WhatsApp is opening with your message.');
  };

  // Copy first (the click must start the copy), then open the platform.
  const shareFacebook = async () => {
    const copying = copy(message);
    openTab(facebookShareUrl(link!, buildShareMessageWithoutLink(cert.programName)));
    say(
      (await copying)
        ? 'Facebook is opening. We also copied your message — paste it into your post if it is not filled in.'
        : 'Facebook is opening.',
    );
  };

  const shareLinkedIn = async () => {
    const copying = copy(message);
    openTab(linkedinShareUrl(link!));
    say(
      (await copying)
        ? 'LinkedIn is opening. It only takes the link, so we copied your message — paste it into your post.'
        : 'LinkedIn is opening with your certificate link.',
    );
  };

  const shareDiscord = async () => {
    const copying = copy(message);
    openTab(DISCORD_OPEN_URL);
    if (await copying) say('Message and link copied. Discord is opening — paste it into any chat or server.');
    else say('Discord is opening. Copying did not work — use "Copy message" below, then paste it into Discord.', 'error');
  };

  const shareInstagram = async () => {
    setShowInstagram(true);
    if (await saveImage()) say('Image saved. Follow the steps below to post it on Instagram.');
  };

  const copyLink = async () => {
    if (!link) return;
    if (await copy(link)) {
      setCopied('link');
      setTimeout(() => setCopied(null), 2500);
      say('Verification link copied.');
    } else {
      say('Copying did not work. Long-press the link to copy it instead.', 'error');
    }
  };

  const copyMessage = async () => {
    if (await copy(message)) {
      setCopied('message');
      setTimeout(() => setCopied(null), 2500);
      say('Message copied — paste it anywhere you like.');
    } else {
      say('Copying did not work. Select the message above and copy it by hand.', 'error');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="share-certificate"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-certificate-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="modal-pop relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-black/10 bg-white p-5 text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#0B1026] dark:text-white sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <X size={20} />
        </button>

        <h2 id="share-certificate-title" className="pr-10 text-xl font-bold">
          Share your achievement 🎉
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{cert.programName}</p>

        {!link ? (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Sharing is unavailable right now because the certificate&apos;s verification link is not set up yet.
            You can still download your certificate from this page.
          </p>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <p
                className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 dark:text-gray-100"
                data-testid="share-message"
              >
                {message}
              </p>
              <button
                type="button"
                onClick={() => void copyMessage()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-black/5 dark:border-gray-600 dark:hover:bg-white/10"
              >
                {copied === 'message' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied === 'message' ? 'Copied' : 'Copy message'}
              </button>
            </div>

            {native && (
              <button
                type="button"
                onClick={() => void shareNative()}
                data-testid="share-native"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-base font-bold text-black transition-all hover:bg-teal-400 active:scale-[0.98]"
              >
                <Share2 className="h-5 w-5" aria-hidden />
                Share…
              </button>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
              <Option testId="share-whatsapp" label="WhatsApp" onClick={shareWhatsApp} chip={chip('#25D366', <MessageCircle className="h-5 w-5" />)} />
              <Option testId="share-facebook" label="Facebook" onClick={() => void shareFacebook()} chip={chip('#1877F2', 'f')} />
              <Option testId="share-linkedin" label="LinkedIn" onClick={() => void shareLinkedIn()} chip={chip('#0A66C2', 'in')} />
              <Option testId="share-discord" label="Discord" onClick={() => void shareDiscord()} chip={chip('#5865F2', <Gamepad2 className="h-5 w-5" />)} />
              <Option
                testId="share-instagram"
                label="Instagram"
                onClick={() => void shareInstagram()}
                disabled={!cert.hasImage}
                chip={chip('linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)', <Camera className="h-5 w-5" />)}
              />
              <Option
                testId="share-copy-link"
                label={copied === 'link' ? 'Link copied' : 'Copy link'}
                onClick={() => void copyLink()}
                chip={chip('#0d9488', copied === 'link' ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />)}
              />
            </div>
          </>
        )}

        <div className="mt-2.5">
          <Option
            testId="share-download-image"
            label="Download image"
            onClick={() => void saveImage().then((ok) => ok && say('Image saved to your device.'))}
            disabled={!cert.hasImage}
            chip={chip('#475569', <Download className="h-5 w-5" />)}
          />
        </div>

        {showInstagram && (
          <div className="mt-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4" data-testid="instagram-steps">
            <p className="text-sm font-bold">Post it on Instagram</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700 dark:text-gray-200">
              {INSTAGRAM_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{INSTAGRAM_NOTE}</p>
          </div>
        )}

        <div aria-live="polite" className="min-h-[1.5rem]">
          {notice && (
            <p
              role="status"
              className={`mt-3 text-sm ${notice.tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-300'}`}
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
