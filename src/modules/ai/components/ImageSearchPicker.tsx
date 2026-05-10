import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  ImageCandidate,
  ImageCandidateSource,
  ImageSearchPayload,
} from '../types/chat.type';
import { proxifyUrl } from '@/lib/apiConfig';

/**
 * Image picker — drives a "prompt → choose / generate / upload → review →
 * confirm" workflow. Three modes:
 *
 *  • BROWSE  – grid of search results + "Generate with AI" entry. The user
 *              either picks one or asks Gemini for a fresh one.
 *  • COMPOSE – textarea for a generation prompt (only shown when the user
 *              chose "Generate with AI").
 *  • REVIEW  – we have a candidate. User sees it large and can edit it,
 *              try a different one, or confirm and ship to RunPod.
 *
 * Source of truth for the candidate is `payload.candidate`, which the
 * parent sets/clears in response to WS events. Local state is just the
 * draft text in the compose / edit forms and which mode we're in.
 */
interface ImageSearchPickerProps {
  payload: ImageSearchPayload;
  /** Confirm: user picked or accepted an image. Pass the URL the worker
   *  should ingest (data: URL when nano-banana made it; http URL for
   *  search results). */
  onSelect: (imageUrl: string) => void;
  /** Compose: ask Gemini for a fresh candidate from a prompt. */
  onGenerateCustom?: (description: string) => void;
  /** Edit: ask Gemini to refine the current candidate. */
  onEditCandidate?: (imageUrl: string, editPrompt: string) => void;
}

type Mode = 'browse' | 'compose' | 'edit';

const SOURCE_LABEL: Record<ImageCandidateSource, string> = {
  search: 'From search',
  ai_generated: 'AI generated',
  ai_edited: 'AI edited',
  uploaded: 'You uploaded',
};

export const ImageSearchPicker: React.FC<ImageSearchPickerProps> = ({
  payload,
  onSelect,
  onGenerateCustom,
  onEditCandidate,
}) => {
  const [mode, setMode] = useState<Mode>('browse');
  const [composeText, setComposeText] = useState(payload.prompt || '');
  const [editText, setEditText] = useState('');
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const candidate: ImageCandidate | undefined = payload.candidate;
  const pending = payload.candidatePending; // 'generate' | 'edit' | undefined
  const error = payload.candidateError;
  const showReview = !!candidate;

  // Once a candidate exists we always render REVIEW. Mode only matters in
  // the pre-candidate state (BROWSE vs COMPOSE).
  const visibleMode: Mode = showReview ? (mode === 'edit' ? 'edit' : 'browse') : mode;

  // ─── Actions ───────────────────────────────────────────────────────────
  const handleSelectFromGrid = (url: string) => {
    // Picking from the search grid creates an immediate candidate. The
    // user still has to confirm — same review step as AI-generated images.
    onGenerateCustomActsAsCandidate(url, 'search');
  };

  /** Synthesise a candidate locally for search-grid picks. We can't round
   *  trip through the backend for these because they're already public. */
  const onGenerateCustomActsAsCandidate = (url: string, source: ImageCandidateSource) => {
    // Fake a candidate by mutating the payload via a faux event — but
    // payload is owned by the parent. Use onSelect as a no-op fallback by
    // synthesising a click on the underlying message; instead we surface
    // through a parent callback. Keep it simple: lift the candidate
    // directly into local state so the parent doesn't have to round-trip
    // through WS just to remember which thumbnail was picked.
    setLocalCandidate({ url, runpod_url: url, source });
    setMode('browse');
  };

  // Local-only candidate for grid picks (avoids a WS round-trip for
  // something we already have on the client).
  const [localCandidate, setLocalCandidate] = useState<ImageCandidate | null>(null);
  const effectiveCandidate = candidate || localCandidate || undefined;
  const effectiveShowReview = !!effectiveCandidate;

  const handleClearCandidate = () => {
    setLocalCandidate(null);
    setMode('browse');
    setEditText('');
    // The server-side candidate (in payload.candidate) can't be cleared
    // from here — the user just visually goes back to BROWSE; if they
    // confirm we still have it.
  };

  const handleSubmitGenerate = () => {
    const t = composeText.trim();
    if (!t || !onGenerateCustom) return;
    onGenerateCustom(t);
    // Stay in COMPOSE while the generation is in flight — the button
    // flips to "Generating…" via the `pending === 'generate'` prop.
    // Once candidate_ready arrives, `effectiveShowReview` becomes true
    // and the picker auto-transitions into REVIEW. If candidate_error
    // arrives we stay here with the error banner so the user can fix
    // the prompt instead of being booted back to the search grid.
  };

  const handleSubmitEdit = () => {
    const t = editText.trim();
    if (!t || !effectiveCandidate || !onEditCandidate) return;
    onEditCandidate(effectiveCandidate.runpod_url || effectiveCandidate.url, t);
    // Same logic as the generate path — stay in EDIT while pending so
    // the spinner is visible. The form is already disabled via the
    // `pending === 'edit'` prop on EditForm; the spinner overlay on
    // the preview also shows. We only clear the editText / leave EDIT
    // when the new candidate actually replaces the current one (driven
    // by candidate_ready in useChat, which mutates payload.candidate).
  };

  const handleConfirm = () => {
    if (!effectiveCandidate) return;
    setConfirming(true);
    onSelect(effectiveCandidate.runpod_url || effectiveCandidate.url);
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Fullscreen lightbox */}
      {expandedUrl && (
        <Lightbox url={expandedUrl} onClose={() => setExpandedUrl(null)} />
      )}

      <div className="mt-3 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* Step indicator */}
        <Header
          step={effectiveShowReview ? 'review' : visibleMode}
          searchQuery={payload.search_query}
          source={effectiveCandidate?.source}
        />

        {/* Body — branches by mode */}
        <div className="p-3 sm:p-4">
          {effectiveShowReview ? (
            <ReviewStep
              candidate={effectiveCandidate!}
              pending={pending}
              error={error}
              onExpand={(u) => setExpandedUrl(u)}
              onTryDifferent={handleClearCandidate}
              onStartEdit={() => setMode('edit')}
              onConfirm={handleConfirm}
              confirming={confirming}
              editForm={
                mode === 'edit' ? (
                  <EditForm
                    value={editText}
                    onChange={setEditText}
                    onSubmit={handleSubmitEdit}
                    onCancel={() => {
                      setEditText('');
                      setMode('browse');
                    }}
                    pending={pending === 'edit'}
                  />
                ) : null
              }
            />
          ) : visibleMode === 'compose' ? (
            <ComposeForm
              value={composeText}
              onChange={setComposeText}
              onSubmit={handleSubmitGenerate}
              onCancel={() => setMode('browse')}
              pending={pending === 'generate'}
              error={error}
              defaultPrompt={payload.prompt}
            />
          ) : (
            <BrowseStep
              imageUrls={payload.image_urls}
              onPick={handleSelectFromGrid}
              onExpand={(u) => setExpandedUrl(u)}
              onAskGenerate={() => setMode('compose')}
              error={error}
              pending={pending === 'generate'}
            />
          )}
        </div>
      </div>
    </>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────

const Header: React.FC<{
  step: 'browse' | 'compose' | 'review';
  searchQuery?: string;
  source?: ImageCandidateSource;
}> = ({ step, searchQuery, source }) => {
  const dot = (active: boolean, done: boolean) => (
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        done
          ? 'bg-primary-500'
          : active
          ? 'bg-primary-500 ring-2 ring-primary-200'
          : 'bg-neutral-300'
      }`}
    />
  );
  const browseActive = step === 'browse' || step === 'compose';
  const reviewActive = step === 'review';
  const browseDone = reviewActive;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-200 bg-neutral-50/60">
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 min-w-0">
        {step === 'review' ? (
          <>
            <Check className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
            <span className="font-medium text-neutral-800 truncate">
              {source ? SOURCE_LABEL[source] : 'Selected image'}
            </span>
          </>
        ) : step === 'compose' ? (
          <>
            <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            <span className="font-medium text-neutral-800">
              Describe what you want
            </span>
          </>
        ) : (
          <>
            <Search className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span className="font-medium text-neutral-800 truncate">
              Pick a reference
              {searchQuery ? (
                <span className="font-normal text-neutral-500">
                  {' '}
                  for "{searchQuery}"
                </span>
              ) : null}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {dot(browseActive, browseDone)}
        <span className="w-3 h-px bg-neutral-300" />
        {dot(reviewActive, false)}
      </div>
    </div>
  );
};

const BrowseStep: React.FC<{
  imageUrls: string[];
  onPick: (url: string) => void;
  onExpand: (url: string) => void;
  onAskGenerate: () => void;
  error?: string;
  pending: boolean;
}> = ({ imageUrls, onPick, onExpand, onAskGenerate, error, pending }) => (
  <div className="space-y-3">
    {error && (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    )}

    {pending && (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-[12px] text-violet-700">
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
        <span>Asking Gemini for a fresh image…</span>
      </div>
    )}

    {imageUrls.length > 0 && (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {imageUrls.map((url, i) => (
          <Thumb
            key={`${url}-${i}`}
            url={url}
            onClick={() => onPick(url)}
            onExpand={() => onExpand(url)}
          />
        ))}
      </div>
    )}

    {/* Entry actions */}
    <div className="pt-1 border-t border-neutral-100 flex items-center justify-between gap-2">
      <span className="text-[11px] text-neutral-500">
        {imageUrls.length > 0
          ? `${imageUrls.length} suggestion${imageUrls.length === 1 ? '' : 's'}`
          : 'No suggestions found'}
      </span>
      <button
        onClick={onAskGenerate}
        disabled={pending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors disabled:opacity-50"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate with AI
      </button>
    </div>
  </div>
);

const ComposeForm: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  error?: string;
  defaultPrompt?: string;
}> = ({ value, onChange, onSubmit, onCancel, pending, error, defaultPrompt }) => (
  <div className="space-y-2">
    {error && (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    )}
    <label className="block text-[11px] text-neutral-500">
      Describe the reference image you want.
      {defaultPrompt && (
        <span className="text-neutral-400">
          {' '}
          We pre-filled your earlier prompt — tweak it for the picture you have
          in mind.
        </span>
      )}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) && !pending) {
          e.preventDefault();
          onSubmit();
        }
      }}
      placeholder="e.g. a left-handed kunai with a red wrapped handle on a white background"
      rows={3}
      disabled={pending}
      autoFocus
      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-60 resize-none"
    />
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        onClick={onCancel}
        disabled={pending}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] text-neutral-500 hover:text-neutral-800 disabled:opacity-50"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to suggestions
      </button>
      <button
        onClick={onSubmit}
        disabled={pending || !value.trim()}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
          pending || !value.trim()
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-violet-500 text-white hover:bg-violet-600'
        }`}
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Generate image
          </>
        )}
      </button>
    </div>
    <p className="text-[10px] text-neutral-400">⌘ + Enter to submit</p>
  </div>
);

const ReviewStep: React.FC<{
  candidate: ImageCandidate;
  pending?: 'generate' | 'edit';
  error?: string;
  onExpand: (url: string) => void;
  onTryDifferent: () => void;
  onStartEdit: () => void;
  onConfirm: () => void;
  confirming: boolean;
  editForm: React.ReactNode;
}> = ({
  candidate,
  pending,
  error,
  onExpand,
  onTryDifferent,
  onStartEdit,
  onConfirm,
  confirming,
  editForm,
}) => {
  const src = proxifyUrl(candidate.url);
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => onExpand(src)}
          className="block w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 group"
          title="Click to expand"
        >
          <img
            src={src}
            alt="Selected reference"
            className="w-full max-h-[280px] object-contain transition-transform group-hover:scale-[1.01]"
          />
        </button>
        {pending === 'edit' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-violet-200 shadow text-[12px] text-violet-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Applying edit…
            </div>
          </div>
        )}
        {candidate.prompt && candidate.source !== 'search' && (
          <p className="mt-1.5 px-1 text-[11px] text-neutral-500 line-clamp-2">
            <span className="font-medium text-neutral-600">Prompt:</span>{' '}
            "{candidate.prompt}"
          </p>
        )}
      </div>

      {editForm}

      {!editForm && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={onTryDifferent}
            disabled={!!pending || confirming}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Try different
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onStartEdit}
              disabled={!!pending || confirming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit with AI
            </button>
            <button
              onClick={onConfirm}
              disabled={!!pending || confirming}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                pending || confirming
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
              }`}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Starting 3D…
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Use for 3D
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EditForm: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}> = ({ value, onChange, onSubmit, onCancel, pending }) => (
  <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <label className="text-[11px] font-medium text-violet-700">
        How should it change? Gemini will paint over what you see.
      </label>
      <button
        onClick={onCancel}
        disabled={pending}
        className="text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
        title="Cancel edit"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !pending) {
          e.preventDefault();
          onSubmit();
        }
      }}
      placeholder="e.g. make the background plain white, remove the second handle"
      rows={2}
      disabled={pending}
      autoFocus
      className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-800 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:opacity-50 resize-none"
    />
    <div className="flex items-center justify-end">
      <button
        onClick={onSubmit}
        disabled={pending || !value.trim()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
          pending || !value.trim()
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-violet-500 text-white hover:bg-violet-600'
        }`}
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Editing…
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Apply edit
          </>
        )}
      </button>
    </div>
  </div>
);

const Thumb: React.FC<{
  url: string;
  onClick: () => void;
  onExpand: () => void;
}> = ({ url, onClick, onExpand }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-lg border border-neutral-200 hover:border-primary-400 transition-all w-full aspect-square bg-neutral-50"
    >
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f5f5f4" width="100" height="100"/%3E%3Ctext x="50" y="54" text-anchor="middle" font-size="12" fill="%23a3a3a3"%3E%3F%3C/text%3E%3C/svg%3E';
        }}
      />
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onExpand();
      }}
      className="absolute top-1 right-1 p-1 bg-black/40 hover:bg-black/60 rounded-md text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
      title="View full size"
    >
      ⤢
    </button>
  </div>
);

const Lightbox: React.FC<{ url: string; onClose: () => void }> = ({
  url,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
    onClick={onClose}
  >
    <button
      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      onClick={onClose}
    >
      <X className="w-5 h-5" />
    </button>
    <img
      src={url}
      alt="Preview"
      className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

export default ImageSearchPicker;
