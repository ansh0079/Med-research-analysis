import React from 'react';
import { useNavigate } from 'react-router-dom';

const EVIDENCE_LANES = [
  {
    label: 'Landmark trials',
    detail: 'Seminal RCTs and practice-changing papers ranked to the top.',
  },
  {
    label: 'Guidelines',
    detail: 'Society recommendations anchored beside the live literature.',
  },
  {
    label: 'Synopsis',
    detail: 'A clear read of one of the top papers — bottom line first.',
  },
  {
    label: 'Mentor',
    detail: 'A teaching message grounded in those papers and guidelines.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#f3f6f4] text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;500;600;700&display=swap');
        .landing-page { font-family: 'Source Sans 3', Georgia, serif; }
        .landing-page .lp-display { font-family: 'Fraunces', Georgia, serif; }
        @keyframes lp-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lp-lane {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .lp-rise { animation: lp-rise 0.7s ease-out both; }
        .lp-fade { animation: lp-fade 1s ease-out both; }
        .lp-lane { animation: lp-lane 0.55s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .lp-rise, .lp-fade, .lp-lane { animation: none; }
        }
      `}</style>

      <nav className="absolute top-0 inset-x-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f3d34] text-[#d7ebe3]">
              <i className="fas fa-dna text-xs" />
            </div>
            <span className="lp-display text-lg font-semibold tracking-tight text-[#0f3d34]">
              Signal MD
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#0f3d34]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="rounded-lg bg-[#0f3d34] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#164f43]"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero — one composition */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 lp-fade"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 70% 20%, #c8e4da 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 10% 80%, #dbe7ef 0%, transparent 50%), linear-gradient(165deg, #eef5f1 0%, #f3f6f4 45%, #e7eef2 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230f3d34\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-5 pb-20 pt-28 lg:flex-row lg:items-end lg:gap-16 lg:pb-28">
          <div className="lp-rise max-w-xl space-y-6 lg:pb-8" style={{ animationDelay: '0.05s' }}>
            <p className="lp-display text-5xl font-semibold leading-[1.05] tracking-tight text-[#0f3d34] sm:text-6xl md:text-7xl">
              Signal MD
            </p>
            <h1 className="lp-display text-2xl font-medium leading-snug text-slate-800 sm:text-3xl">
              Search a topic. Get landmark trials, guidelines, and a mentor who can teach it.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              Then generate a paper synopsis, MCQs, or a case scenario from the same evidence.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="rounded-lg bg-[#0f3d34] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:bg-[#164f43] hover:scale-[1.02] active:scale-[0.99]"
              >
                Start free
              </button>
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="rounded-lg px-6 py-3.5 text-sm font-semibold text-[#0f3d34] underline-offset-4 transition-colors hover:underline"
              >
                Try a search
              </button>
            </div>
          </div>

          {/* Product visual — evidence workspace preview */}
          <div
            className="lp-rise mt-12 w-full max-w-lg lg:mt-0 lg:ml-auto"
            style={{ animationDelay: '0.22s' }}
            aria-hidden="true"
          >
            <div className="relative overflow-hidden rounded-2xl border border-[#0f3d34]/15 bg-white/80 shadow-[0_24px_80px_-40px_rgba(15,61,52,0.45)] backdrop-blur-sm">
              <div className="border-b border-slate-200/80 bg-[#0f3d34] px-5 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8cfc3]">
                  Topic search
                </p>
                <p className="lp-display mt-1 text-lg text-white">Management of PRES</p>
              </div>
              <div className="space-y-0 divide-y divide-slate-100 p-0">
                {EVIDENCE_LANES.map((lane, i) => (
                  <div
                    key={lane.label}
                    className="lp-lane flex gap-4 px-5 py-4"
                    style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e7f2ee] text-[11px] font-bold text-[#0f3d34]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{lane.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{lane.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* After one search */}
      <section className="border-t border-slate-200/80 bg-white px-5 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[#0f3d34] sm:text-4xl">
            After one search, the evidence is already organised
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            No dashboard of tools. You get a ranked reading list sorted into what matters clinically — then a mentor message built from that same set.
          </p>
          <ol className="mt-12 space-y-8">
            {EVIDENCE_LANES.map((lane, i) => (
              <li key={lane.label} className="flex gap-5 border-l-2 border-[#0f3d34]/20 pl-5">
                <span className="lp-display text-2xl font-medium text-[#0f3d34]/40">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{lane.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{lane.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Learn from it */}
      <section className="relative overflow-hidden border-t border-slate-200/80 px-5 py-24">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #eef5f1 0%, #f7faf8 100%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[#0f3d34] sm:text-4xl">
            Learn from the same papers
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Turn the top evidence into practice without opening another app.
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f3d34]/70">MCQs</p>
              <p className="lp-display mt-2 text-xl font-medium text-slate-900">
                Quiz yourself on what the literature actually says
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Adaptive questions grounded in teaching points and guideline anchors from your topic.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f3d34]/70">Case scenarios</p>
              <p className="lp-display mt-2 text-xl font-medium text-slate-900">
                Walk a patient case built from the same evidence
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Clinical vignettes that rehearse decisions, not just recall facts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple flow */}
      <section className="border-t border-slate-200/80 bg-white px-5 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="lp-display text-2xl font-semibold text-[#0f3d34] sm:text-3xl">
            Topic → evidence → teach
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Search once. Read the organised evidence. Ask the mentor. Test yourself with MCQs or a case.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-semibold text-[#0f3d34]">
            {['Search', 'Landmark & guidelines', 'Synopsis', 'Mentor', 'MCQ / Case'].map((step, i, arr) => (
              <React.Fragment key={step}>
                <span>{step}</span>
                {i < arr.length - 1 && (
                  <span className="text-slate-300" aria-hidden="true">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200/80 bg-[#0f3d34] px-5 py-24 text-center">
        <div className="mx-auto max-w-lg space-y-5">
          <h2 className="lp-display text-3xl font-semibold text-white sm:text-4xl">
            Start with one clinical topic
          </h2>
          <p className="text-sm leading-relaxed text-[#a8cfc3]">
            Free to begin. No credit card required.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-[#0f3d34] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Create free account
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#f3f6f4] px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Signal MD — evidence for learning, not clinical advice
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <button type="button" onClick={() => navigate('/legal/terms')} className="hover:text-slate-800">
              Terms
            </button>
            <button type="button" onClick={() => navigate('/legal/privacy')} className="hover:text-slate-800">
              Privacy
            </button>
            <button type="button" onClick={() => navigate('/legal/compliance')} className="hover:text-slate-800">
              Security
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
