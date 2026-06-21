# 🧠 NEXUS AI

### Antifragile Intelligence for the **Brains of Tomorrow**

> Empowering tomorrow's businesses & young entrepreneurs to anticipate disruption, turn threats into advantage, and build things that *get stronger* under stress.

[![Built for Brainwave 2026](https://img.shields.io/badge/Built%20for-Brainwave%202026-1D9E75?style=for-the-badge)](#)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js)](#)
[![Groq LLM](https://img.shields.io/badge/AI-Groq%20Llama%203.3%2070B-EF9F27?style=for-the-badge)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-378ADD?style=for-the-badge&logo=typescript&logoColor=white)](#)

**Theme:** *Empowering Brains of Tomorrow Innovations* — using AI & emerging tech to solve a real-world problem: **most businesses and young founders are flying blind into a decade of accelerating disruption.**

---

## 🔗 Live Demo & Quick Start

| | |
|---|---|
| 🌐 **Live demo** | *https://nexusfounder.vercel.app* |
| 🎬 **Demo video** | See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) |
| 📊 **Pitch deck** | See [`docs/PITCH_DECK.md`](docs/PITCH_DECK.md) |

---

## 🧠 The Problem

The "brains of tomorrow" — SMEs, first-time founders, and students building the next wave — face a brutal asymmetry:

- **AI is disrupting every function** (sales, support, ops, marketing) faster than any team can track.
- **Volatility is the new normal** — supply shocks, demand cliffs, ransomware, shifting regulation (DPDP Act, GST 2.0, ONDC).
- **Expert strategy is locked behind ₹50L+ consultants** that no SME or student founder can afford.
- **Young founders validate ideas on vibes**, burn their first six months, and learn the hard truths too late.

The result: great ideas and good businesses die not because they were wrong, but because they couldn't *see the next hit coming.*

---

## 💡 The Solution

**NEXUS AI is a 24/7 AI C-Suite + Founder Mentor in your browser.** Three modes, one mission — make the brains of tomorrow **antifragile**.

### 🛰️ Nexus Mode — External Intelligence
Type any business name or URL → get a **FutureProof Score (0–100)** and a full C-suite report: AI-disruption risks by function, **live web-grounded** market signals, workforce evolution, opportunity gaps, and a 90-day / 1-year / 3-year roadmap.

### 🛡️ Vanguard Mode — Internal Resilience Command Center
Upload your real data (CSV/PDF: sales, inventory, suppliers, contracts) → a live risk Command Center with:
- **Oracle Agent** — a data-grounded advisor that quotes *your* numbers verbatim and returns **prioritized (P0/P1/P2), effort-rated** actions plus the single **KPI to watch next**.
- **Scenario Simulator** — "panic buttons" (Red Sea Crisis, Raw Material Shortage, Demand Drop, **Cyber Threat**) that simulate a 90-day shock and generate a mitigation plan.
- **Realtime Alert Feed** (Supabase Realtime).

### 🚀 Young Founder Mode — *Brains of Tomorrow* (new)
A student / first-time founder describes an idea + stage → an honest **Validation Score** and a complete playbook: risk flags, a **lean launch roadmap** (2 weeks → 1 month → 3 months), a bootstrap-first **funding strategy** (Startup India, grants, incubators), **AI tools to move 10× faster**, your **first 10 customers**, the metrics that matter, and India-relevant resources.

> Every output is **honest by design**: the AI refuses to fabricate ₹ figures, flags thin data, and caps scores when there isn't enough to go on.

---

## ✨ Key Features

| Feature | What makes it special |
|---|---|
| 🎯 **FutureProof / Validation Score** | A single 0–100 number with a color-coded verdict, server-capped by input/data quality so it can't be gamed. |
| 🌐 **Live web grounding** | Market signals grounded in real-time web results via Tavily — labeled *"Grounded by live web search"* with clickable sources. Degrades honestly to *"AI-inferred"* with no key. |
| 🤖 **Oracle Agent** | Structured, prioritized, effort-rated actions + a "watch this metric" KPI + a confidence level — never hallucinated numbers. |
| 💥 **Scenario Simulator** | Animated before/after projections + a mitigation plan. The **Cyber Threat** scenario is hardened with India's real compliance clock: **CERT-In 6-hour reporting** + **DPDP Act 2023 breach notification**. |
| 🚀 **Young Founder Mode** | Turns a one-line idea into a fundable, executable founder playbook in ~30 seconds. |
| 🔒 **Privacy & Security** | Server-side-only AI/DB keys, session-held uploads, optional best-effort persistence, and one-click Reset. |
| 🎨 **Design** | Dark glassmorphism UI, Framer Motion, Recharts, fully responsive. |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router) · React 19 · TypeScript (strict)
- **AI Engine:** Groq `llama-3.3-70b-versatile` with **strict JSON mode** (`lib/groq.ts`)
- **Live grounding:** Tavily Search API (env-gated, graceful fallback)
- **Backend / Realtime:** Supabase (PostgreSQL + Realtime)
- **UI:** Tailwind CSS · shadcn/ui · Radix · Framer Motion · Recharts · Lucide
- **Data:** PapaParse (CSV) · lightweight PDF text extraction
- **Fonts:** Space Grotesk (display) + Inter (body)

---

## 🗂️ Project Structure

```
NexusAI/
├── app/
│   ├── page.tsx                    # Landing + Nexus Mode (Pillar 1)
│   ├── dashboard/page.tsx          # Command Center (Pillar 2 · Vanguard)
│   ├── founder/page.tsx            # Young Founder Mode (Pillar 3)  ★ new
│   ├── layout.tsx                  # Metadata, fonts, theme
│   └── api/
│       ├── analyze-external/       # Nexus report (+ live web grounding) ★
│       ├── oracle/                 # Oracle Agent (prioritized actions)  ★
│       ├── simulate/               # Scenario Simulator (hardened Cyber) ★
│       ├── upload/                 # CSV/PDF ingest → The Vault
│       └── founder/                # Young Founder playbook              ★ new
├── components/
│   ├── ResultsDashboard.tsx        # Nexus report UI (+ Sources)         ★
│   ├── CommandCenter.tsx           # Vanguard layout (+ privacy)         ★
│   ├── OracleChat.tsx              # Oracle UI (priority/effort/metric)  ★
│   ├── ScenarioSimulator.tsx       # Panic buttons (+ compliance note)   ★
│   ├── FounderInsights.tsx         # Young Founder report UI             ★ new
│   ├── PrivacyNote.tsx             # Reusable privacy/security note      ★ new
│   ├── Vault.tsx · AlertFeed.tsx · ScoreRing.tsx · RiskBars.tsx · ActionRoadmap.tsx
│   └── ui/                         # shadcn primitives
├── lib/
│   ├── groq.ts                     # Groq client + NEXUS & FOUNDER prompts ★
│   ├── search.ts                   # Tavily live web grounding            ★ new
│   ├── supabase.ts · types.ts · utils.ts
├── supabase/migrations/0001_init.sql
└── docs/
    ├── PITCH_DECK.md               # 10-slide structure                   ★ new
    └── DEMO_SCRIPT.md              # 2–4 min demo script                  ★ new
```
`★ = added or upgraded for Brainwave 2026`

---

## 🚀 How to Run

**1. Clone & install**
```bash
git clone <your-repo-url>
cd NexusAI
npm install
```

**2. Configure environment** — copy `.env.example` → `.env.local`:
```env
# Required for live AI analysis
GROQ_API_KEY=gsk_xxxxxxxx                 # https://console.groq.com/keys

# Optional — enables live web grounding (degrades gracefully if absent)
TAVILY_API_KEY=tvly-xxxxxxxx              # https://tavily.com (1,000 free/mo)

# Optional — enables persistence + realtime alerts (app works without it)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**3. (Optional) Set up Supabase** — run `supabase/migrations/0001_init.sql` in the SQL Editor.

**4. Start**
```bash
npm run dev          # → http://localhost:3000
```

> 💡 **Zero-config demo:** the Scenario Simulator and Alert Feed run on built-in fallbacks, so the app is fully demoable even before you add any keys.

---

## 🔒 Data Privacy & Security

Because users upload sensitive business data, privacy is a first-class feature — stated accurately, not as marketing:

- 🔑 **AI & database keys run only on the server** — they never reach the browser.
- 📂 **Uploaded files are parsed for analysis and held in your session.**
- 💾 **Saving to the database is optional, best-effort, and scoped to your workspace.**
- 🚫 **Your data is never sold or used to train AI models.**
- ♻️ **Reset wipes everything instantly.**

This note is shown in-app (The Vault, Command Center, landing footer) so users see it exactly where they share data.

---

## 🏆 Why This Wins — mapped to the judging criteria

| Criterion | Weight | How NEXUS AI scores |
|---|---|---|
| **Innovation & Creativity** | 25% | Three fused modes — external intelligence, internal resilience, and *Young Founder Mode* — plus **live web-grounded** AI and an "honest-by-design" engine that refuses to hallucinate. |
| **Technical Implementation** | 25% | Next.js 15 + React 19 + strict TS, Groq strict-JSON with server-side score-capping & sanitizers, env-gated Tavily grounding, Supabase Realtime, deterministic simulation fallbacks. |
| **Impact & Problem Solving** | 20% | Democratizes ₹50L-consultant-grade strategy for SMEs *and* the next generation of founders; the Cyber scenario teaches **real CERT-In / DPDP compliance**. |
| **User Experience & Design** | 15% | Glassmorphism UI, animated scores & charts, graceful empty states, mobile-responsive, one-click PDF export. |
| **Scalability & Feasibility** | 10% | Serverless on Vercel, stateless API routes, optional Supabase, free-tier AI — scales to thousands of users at near-zero cost. |
| **Presentation & Demo** | 5% | Ready-to-use [10-slide deck](docs/PITCH_DECK.md) + [demo script](docs/DEMO_SCRIPT.md). |

---

## 🔮 Future Roadmap

- 📈 **Continuous monitoring** — scheduled re-scans that push alerts when a company's FutureProof Score moves.
- 🧩 **Founder cohorts** — team workspaces + mentor sharing for incubators and colleges.
- 🗣️ **Voice & vernacular** — multilingual founder mode for tier-2/3 India.
- 🔗 **Deeper grounding** — news, filings, and ONDC/GST signal feeds.
- 📑 **Full PDF/contract intelligence** — clause-level risk extraction.
- 📱 **Mobile PWA** for on-the-go founders.

---

<div align="center">

### Built for **Brainwave 2026** — *Empowering Brains of Tomorrow* 🧠⚡

*Helping today's businesses and tomorrow's founders become antifragile.*

</div>
