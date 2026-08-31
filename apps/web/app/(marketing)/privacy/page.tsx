"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-16 px-4">
        <Link
          href="/"
          className="btn-primary-light text-sm py-2 px-4 inline-flex items-center mb-8"
        >
          Back
        </Link>

        <h1 className="text-3xl font-semibold text-dark tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-dark-secondary text-sm mb-8">
          Effective date: [insert date before publishing] · Last updated:
          [insert date]
        </p>

        <div className="space-y-8 text-black/70 text-sm leading-relaxed">
          <p>
            This Privacy Policy explains what information Pible
            (&quot;Pible,&quot; &quot;we,&quot; &quot;us&quot;) collects when
            you use our web dashboard, CLI, browser extension, or VS Code
            extension (together, the &quot;Service&quot;), how we use it, and
            the choices you have. It&apos;s written to be read by an actual
            person, not just a lawyer — if anything here is unclear, contact us
            at [insert contact email].
          </p>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              1. Who this applies to
            </h2>
            <p>
              This policy covers anyone who creates a Pible account, connects a
              repository, or otherwise uses the Service — whether you&apos;re a
              solo developer or part of a team.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              2. What we collect
            </h2>

            <h3 className="text-base font-medium text-black/90 mt-6 mb-2">
              2.1 Account information (via GitHub or Google sign-in)
            </h3>
            <p>
              Pible uses GitHub and Google OAuth for sign-in and account
              creation — there is no separate email/password account. When you
              sign in, the provider shares:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-black/60">
              <li>Your name and email address</li>
              <li>Your profile photo/avatar</li>
              <li>A unique account identifier from that provider</li>
            </ul>
            <p className="mt-3">
              We do not receive your GitHub or Google password, and we only
              request the minimum OAuth scopes needed to identify you and (for
              GitHub) link a repository to a Pible project.
            </p>

            <h3 className="text-base font-medium text-black/90 mt-6 mb-2">
              2.2 Project data
            </h3>
            <p>To do its job, Pible stores:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-black/60">
              <li>
                <strong className="text-black/80">Project metadata</strong> —
                name, repository URL, overall progress, current phase
              </li>
              <li>
                <strong className="text-black/80">Project Memory</strong> —
                architecture notes, technical decisions, and known issues,
                whether entered by you or reported by an AI agent
              </li>
              <li>
                <strong className="text-black/80">Tasks and Task Runs</strong> —
                task titles, descriptions, status, and agent-submitted run
                records (files changed, summary, test results, confidence score)
              </li>
              <li>
                <strong className="text-black/80">Timeline events</strong> — a
                log of key actions (task completions, decisions logged, issues
                discovered, phase changes)
              </li>
            </ul>
            <p className="mt-3">
              <strong className="text-black/80">
                What we deliberately do not collect:
              </strong>{" "}
              Pible does not store your source code or full file contents. By
              design, we store project <em>structure</em>, <em>decisions</em>,
              and <em>summaries</em> — not the underlying codebase itself. If a
              feature ever changes this, we&apos;ll update this policy and ask
              for your consent before doing so.
            </p>

            <h3 className="text-base font-medium text-black/90 mt-6 mb-2">
              2.3 CLI and agent activity
            </h3>
            <p>
              The CLI and connected AI agents authenticate using scoped,
              revocable API keys (not your OAuth login). Activity through these
              keys — task updates, context requests, issue reports — is stored
              the same way as any other project data described above.
            </p>

            <h3 className="text-base font-medium text-black/90 mt-6 mb-2">
              2.4 Technical and usage data
            </h3>
            <p>
              Like most web services, we automatically log basic technical data
              (IP address, browser/device type, timestamps, error logs) for
              security, debugging, and abuse prevention.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              3. How we use this information
            </h2>
            <ul className="list-disc list-inside space-y-1 text-black/60">
              <li>
                To operate the Service: authenticate you, sync your project
                state, and compile context packages for your AI agents
              </li>
              <li>
                To maintain and improve reliability and security (e.g. detecting
                abuse of API keys)
              </li>
              <li>
                To communicate with you about your account or material changes
                to the Service
              </li>
              <li>
                We do <strong className="text-black/80">not</strong> sell your
                data, and we do not use your project data to train third-party
                AI models
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              4. Where your data lives
            </h2>
            <ul className="list-disc list-inside space-y-1 text-black/60">
              <li>
                <strong className="text-black/80">Server-side storage:</strong>{" "}
                project metadata, Project Memory, tasks, and history are stored
                in our PostgreSQL database and cached in Redis, hosted on
                [Railway/Render, migrating to AWS/GCP as noted in our
                infrastructure — insert actual provider once finalized].
              </li>
              <li>
                <strong className="text-black/80">Local storage:</strong> a
                human-readable mirror of your project state is written to the{" "}
                <code className="text-black/80 bg-black/5 px-1.5 py-0.5 rounded text-xs">
                  .pible/
                </code>{" "}
                folder inside your own repository. This folder is yours — if you
                commit it to git, it lives wherever your repository lives,
                subject to your own repo&apos;s visibility settings (public or
                private).
              </li>
              <li>
                <strong className="text-black/80">Sub-processors:</strong> we
                rely on infrastructure and identity providers to run the
                Service, currently including [Vercel — hosting], [Railway/Render
                — API/DB/cache], GitHub (OAuth), and Google (OAuth). Each has
                its own privacy practices governing the data they process on our
                behalf.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              5. Data retention &amp; deletion
            </h2>
            <ul className="list-disc list-inside space-y-1 text-black/60">
              <li>
                You can delete a project from the dashboard at any time, which
                removes its Project Memory, tasks, and history from our servers.
              </li>
              <li>
                Deleting your account removes your profile information and
                disconnects all linked projects.
              </li>
              <li>
                The local{" "}
                <code className="text-black/80 bg-black/5 px-1.5 py-0.5 rounded text-xs">
                  .pible/
                </code>{" "}
                mirror in your repository is not automatically deleted when you
                delete server-side data — it&apos;s your file, under your
                control, like any other file in your repo.
              </li>
              <li>
                We may retain minimal technical/security logs for a limited
                period after deletion for fraud prevention and legal compliance.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              6. Your choices and rights
            </h2>
            <ul className="list-disc list-inside space-y-1 text-black/60">
              <li>
                <strong className="text-black/80">
                  Access &amp; correction:
                </strong>{" "}
                you can view and edit most of your project data directly in the
                dashboard.
              </li>
              <li>
                <strong className="text-black/80">API key revocation:</strong>{" "}
                you can revoke any CLI/agent API key at any time from your
                account settings, immediately cutting off that key&apos;s
                access.
              </li>
              <li>
                <strong className="text-black/80">Data deletion:</strong> see
                Section 5.
              </li>
              <li>
                Depending on your location, you may have additional rights under
                applicable law (e.g. GDPR, CCPA) — including the right to
                request a copy of your data or object to certain processing.
                Contact us at [insert contact email] to exercise these rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              7. Security
            </h2>
            <p>
              We use industry-standard measures to protect your data, including
              encrypted connections (HTTPS/TLS), hashed/salted API keys, and
              scoped, short-lived tokens. No system is perfectly secure, and
              we&apos;ll notify affected users in the event of a breach as
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              8. Children&apos;s privacy
            </h2>
            <p>
              The Service is not directed at children under 13 (or the relevant
              age of digital consent in your jurisdiction), and we do not
              knowingly collect data from them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              9. Changes to this policy
            </h2>
            <p>
              We may update this policy as the Service evolves. Material changes
              will be communicated via the dashboard or email before they take
              effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mt-8 mb-3">
              10. Contact
            </h2>
            <p>
              Questions about this policy or your data? Reach us at [insert
              contact email] or [insert company/individual name and address if
              legally required in your jurisdiction].
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
