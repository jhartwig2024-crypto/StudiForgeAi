# StudyForgeAI — AI Exam Prep

**Study smarter. Know what to study.**

A complete, modern exam-preparation web app for high-school students: upload your material → the AI builds a personalised plan → you study → it tests you → it finds your weak topics → the plan adapts.

---

## Run it

Everything is static — no build step, no server code.

```bash
cd files
python3 -m http.server 8080
# open http://localhost:8080
```

> Open `index.html` through a local web server rather than double-clicking the file:
> browsers restrict `localStorage` on `file://`, and the demo stores your account there.

## Pages

| File | What it is |
|---|---|
| `index.html` | Landing page — hero + dashboard preview, 8 features, 3-step how-it-works, pricing (Free / Pro $3.99), FAQ, footer |
| `signup.html` | Sign up (email + Google), terms, validation |
| `login.html` | Log in, remember me, Google sign-in |
| `forgot-password.html` | Reset flow (email → new password → confirmation) |
| `onboarding.html` | 4-step wizard: year level → subjects → exams → daily study time |
| `dashboard.html` | Today's plan, exam readiness, weakest topic, upcoming exams, quick tools |
| `create-exam.html` | Exam form, topic builder, uploads, topic extraction, AI plan generation |
| `exam.html` | Single exam: day-by-day plan, topic confidence, material, results history |
| `exams.html` | All exams — switch active, delete, readiness per exam |
| `quiz.html` | Adaptive quizzes, weak-topic drills and timed practice exams |
| `flashcards.html` | Auto-generated deck with flip animation and repeat-until-known |
| `tutor.html` | Context-aware AI tutor chat (explain / example / quiz me / summary / priorities) |
| `materials.html` | Notes & PDF uploads, paste-in notes, detected topics, material health |
| `progress.html` | Readiness breakdown, accuracy trend chart, momentum bars |
| `account.html` | Profile, study preferences, subscription, security, export, delete |

## Core features

- **Personalised study plans** — day-by-day sessions scheduled backwards from the exam date, weighted to your weakest topics, finishing with timed mocks. Every day fits your stated daily budget exactly.
- **AI quizzes & practice exams** — questions generated from your own uploaded text (gap-fill from your sentences, true/false, key-term identification) plus confidence self-checks when there's no material yet.
- **AI flashcards** — cards written from your notes, with cards you miss pushed back into the same session.
- **Weak-topic detection** — mastery per topic updated after every quiz, flashcard pass or self-rating.
- **Exam readiness score** — `0.62 × mean mastery + 0.18 × coverage + 0.20 × plan completion`.
- **Adaptive loop** — quiz → mastery update → readiness recalculates → remaining plan rebuilt around the new weak spots.
- **Free vs Pro** — Free is capped at 1 active exam, 40 AI questions and 3 uploads; Pro unlocks everything for $3.99/month.

## Project structure

```
files/
├── index.html … account.html     (15 pages)
└── assets/
    ├── app.css                   design system (dark navy · white · light blue)
    └── app.js                    auth, storage, plan engine, quiz engine, UI kit
```

## Where to plug in a real AI model

This build ships a **local engine** so the whole product works offline and with zero API cost. To go live, replace the four functions in the `SF.ai` namespace in `assets/app.js` — the rest of the app needs no changes:

| Function | Replace with |
|---|---|
| `SF.ai.buildQuestions(exam, topics, count)` | A call that sends the topic list + extracted material text and returns `{q, options, answer, why, topic}` objects |
| `SF.ai.generatePlan(exam)` | A planning call returning `[{day, date, items:[{title, type, topic, minutes}]}]` |
| `SF.ai.weakestTopic(exam)` / `readiness(exam)` | Keep, or move the scoring server-side |
| `SF.ai.applyResults(exam, results, mode)` | Send results for server-side mastery modelling |

Also swap these for production:

1. **Auth** — `SF.auth.*` is demo-only, hashed locally in the browser. Move to your own backend with real sessions.
2. **Password reset** — currently local (no email is sent).
3. **Uploads** — non-text files (PDF/DOCX/PPTX/images) are indexed and attached but their text is not read in the browser. Add server-side extraction (e.g. `pdfplumber`, `python-pptx`) before the AI step; pasted and `.txt`/`.md` material is already parsed client-side.
4. **Billing** — "Upgrade to Pro" flips a local flag. Wire it to Stripe.

## Notes

- Fully responsive; the app shell collapses to a slide-out sidebar under 900 px.
- Accessible-by-default: labelled inputs, `aria-pressed` chips, keyboard-friendly controls, `prefers-reduced-motion` support.
- Storage degrades gracefully: `localStorage` → `sessionStorage` → memory.
