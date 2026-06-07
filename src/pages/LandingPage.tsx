import React from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: 'fa-search',
    color: 'from-indigo-500 to-indigo-600',
    glow: 'shadow-indigo-500/20',
    title: '100 M+ papers, one search',
    body: 'PubMed, Semantic Scholar, and OpenAlex searched simultaneously. Results deduplicated, ranked by impact, and retraction-checked automatically.',
  },
  {
    icon: 'fa-robot',
    color: 'from-violet-500 to-violet-600',
    glow: 'shadow-violet-500/20',
    title: 'AI synthesis in seconds',
    body: 'Gemini synthesises evidence into a GRADE-aligned summary with certainty ratings, key findings, and conflicting evidence — not just a list of abstracts.',
  },
  {
    icon: 'fa-stethoscope',
    color: 'from-emerald-500 to-emerald-600',
    glow: 'shadow-emerald-500/20',
    title: 'Case → Review in one click',
    body: 'Describe a patient scenario. Find the evidence. Start a full systematic review with PICO extraction and PRISMA tracking — all from the same tool.',
  },
  {
    icon: 'fa-shield-alt',
    color: 'from-sky-500 to-sky-600',
    glow: 'shadow-sky-500/20',
    title: 'Deploy on your infrastructure',
    body: 'Self-host on your institution\'s servers. Patient data never leaves your network. Full Docker + Kubernetes manifests included.',
  },
];

const PERSONAS = [
  {
    icon: 'fa-user-md',
    label: 'Clinician-Researcher',
    description: 'Go from a complex patient case to synthesised evidence in under a minute, then start a formal review if the question warrants it.',
  },
  {
    icon: 'fa-flask',
    label: 'Academic Researcher',
    description: 'Run multi-source searches, automate PICO extraction, screen with AI assistance, and export PRISMA-ready data to CSV.',
  },
  {
    icon: 'fa-graduation-cap',
    label: 'Medical Student / Trainee',
    description: 'Find the best evidence fast, understand it in plain English, and quiz yourself on what the literature actually says.',
  },
];

const STATS = [
  { value: '3', label: 'databases searched' },
  { value: '100 M+', label: 'papers indexed' },
  { value: '<5 s', label: 'to AI synthesis' },
  { value: '1-click', label: 'case-to-review flow' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <i className="fas fa-dna text-white text-xs" />
            </div>
            <span className="text-sm font-black tracking-tight">Signal<span className="text-indigo-400"> MD</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/auth')}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              Sign in
            </button>
            <button type="button" onClick={() => navigate('/auth')}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-5 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-20 left-1/3 w-[400px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Built for clinician-researchers — not just academics
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
            From patient case to<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              published evidence
            </span>
            <br />in minutes.
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Search 100 M+ papers across PubMed, Semantic Scholar, and OpenAlex. Get AI-synthesised evidence with GRADE ratings. Start a systematic review from a clinical case — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button type="button" onClick={() => navigate('/auth')}
              className="px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl text-sm transition-all shadow-xl shadow-indigo-500/25">
              Start free — no credit card
            </button>
            <button type="button" onClick={() => navigate('/search')}
              className="px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl text-sm transition-all">
              Try without signing in →
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 pt-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black">Everything in one workflow</h2>
            <p className="text-slate-400 mt-2 text-sm">No more tab-switching between search tools, AI chatbots, and review software.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.05] transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg ${f.glow}`}>
                  <i className={`fas ${f.icon} text-white text-sm`} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case → Review pipeline highlight */}
      <section className="py-20 px-5 border-t border-white/5 bg-gradient-to-b from-transparent to-indigo-950/20">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <i className="fas fa-route text-[10px]" /> Unique workflow
          </div>
          <h2 className="text-3xl font-black">The only tool that goes<br />case → evidence → review</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl mx-auto">
            Describe a patient scenario. The AI generates a search query, retrieves evidence from three databases, synthesises it with GRADE ratings — then lets you launch a full systematic review with one click, pre-seeded with those articles.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap text-xs text-slate-500">
            {['Case description', '→', 'AI search query', '→', 'Evidence synthesis', '→', 'Systematic review', '→', 'PICO + PRISMA'].map((s, i) => (
              <span key={i} className={s === '→' ? 'text-indigo-500' : 'px-2.5 py-1 bg-white/5 rounded-lg text-slate-300'}>
                {s}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => navigate('/case')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20">
            <i className="fas fa-stethoscope text-xs" /> Try Case Mode →
          </button>
        </div>
      </section>

      {/* Personas */}
      <section className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black">Built for the people doing both</h2>
            <p className="text-slate-400 mt-2 text-sm">Clinicians who publish. Researchers who practice. Trainees who need answers fast.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PERSONAS.map((p) => (
              <div key={p.label} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  <i className={`fas ${p.icon} text-indigo-400`} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{p.label}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo video section */}
      {/* TODO: Replace DEMO_VIDEO_EMBED_URL with your YouTube/Vimeo embed URL, e.g. https://www.youtube.com/embed/your-video-id */}
      {false && (
        <section className="py-20 px-5 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black">See it in 60 seconds</h2>
              <p className="text-slate-400 mt-2 text-sm">Patient case → evidence synthesis → systematic review. One tool, one workflow.</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl shadow-indigo-500/10" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src="DEMO_VIDEO_EMBED_URL"
                title="Signal MD demo"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {/* Beta programme */}
      <section className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-4">Clinical beta programme</p>
            <h2 className="text-2xl font-black text-white mb-3">Built with practising clinicians</h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              We are onboarding hospital teams and academic supervisors for structured beta testing.
              Search ranking, topic synopses, and MCQ quality improve as more verified users interact with the platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Evidence-first search',
                body: 'Multi-source retrieval with clinical filtering, guideline snapshots, and transparent ranking signals.',
              },
              {
                title: 'Teaching objects',
                body: 'Topic synopses, grounded claims, and adaptive MCQs seeded from PubMed and guideline sources.',
              },
              {
                title: 'Systematic review lane',
                body: 'Screening queues, PRISMA counts, and export paths designed for trainee-led reviews.',
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-3">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legacy social proof block removed — replace with verified pilot quotes when available */}
      {false && (
      <section className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Trusted by researchers at</p>
            <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
              {['Research Institution', 'Academic Medical Center', 'University Hospital', 'Evidence Synthesis Lab'].map((name) => (
                <div key={name} className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-slate-500">
                  {name}
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote: '"Cut our literature review time from two weeks to an afternoon. The GRADE synthesis is accurate enough to trust."',
                name: 'Senior Registrar',
                role: 'Emergency Medicine',
                initials: 'SR',
                color: 'from-emerald-500 to-teal-600',
              },
              {
                quote: '"The case-to-review flow is the first tool I\'ve seen that actually matches how clinician-researchers think."',
                name: 'Academic Clinician',
                role: 'Cardiology · Research Lead',
                initials: 'AC',
                color: 'from-indigo-500 to-violet-600',
              },
              {
                quote: '"I used it for my final year dissertation. The spaced repetition on top of real evidence is genuinely different."',
                name: 'Final Year Medical Student',
                role: 'University of [City]',
                initials: 'MS',
                color: 'from-violet-500 to-fuchsia-600',
              },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-4">
                <p className="text-sm text-slate-300 leading-relaxed italic">{t.quote}</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[10px] text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Bottom CTA */}
      <section className="py-24 px-5 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-3xl font-black">Ready to accelerate your evidence workflow?</h2>
          <p className="text-slate-400 text-sm">Free to get started. No credit card required.</p>
          <button type="button" onClick={() => navigate('/auth')}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl text-sm transition-all shadow-xl shadow-indigo-500/20">
            Create free account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <i className="fas fa-dna text-white text-[8px]" />
            </div>
            <span className="text-xs text-slate-500">Signal MD — research acceleration, not clinical advice</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <button type="button" onClick={() => navigate('/legal/terms')}
              className="hover:text-slate-400 transition-colors">Terms</button>
            <button type="button" onClick={() => navigate('/legal/privacy')}
              className="hover:text-slate-400 transition-colors">Privacy</button>
            <button type="button" onClick={() => navigate('/legal/compliance')}
              className="hover:text-slate-400 transition-colors">Security & Compliance</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
