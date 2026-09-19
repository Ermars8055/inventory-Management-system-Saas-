import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm text-primary hover:underline"
          >
            &larr; Back to Home
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Last updated: September 20, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          {/* 1. Acceptance */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using StockPilot ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to all of these terms, you may not access or
              use the Service. These terms apply to all visitors, users, and others who access the
              Service. We reserve the right to update or modify these terms at any time, and your
              continued use of the Service after any such changes constitutes your acceptance of
              the new terms.
            </p>
          </section>

          {/* 2. Account Terms */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              2. Account Terms
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                You must provide accurate, complete, and current information when creating an
                account. Failure to do so constitutes a breach of these Terms.
              </li>
              <li>
                You are responsible for safeguarding the password used to access the Service and
                for any activities or actions under your account.
              </li>
              <li>
                You must notify us immediately upon becoming aware of any unauthorized use of
                your account or any other security breach.
              </li>
              <li>
                You may not use as a username the name of another person or entity without
                proper authorization, or a name that is otherwise offensive, vulgar, or obscene.
              </li>
              <li>
                One person or legal entity may maintain no more than one free account.
              </li>
            </ul>
          </section>

          {/* 3. Billing */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              3. Billing and Payments
            </h2>
            <p className="mb-2">
              Paid features of the Service are billed on a subscription basis ("Subscription").
              You will be billed in advance on a recurring monthly or annual cycle, depending on
              the plan you select.
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                All fees are exclusive of applicable taxes, which will be charged as required by
                law.
              </li>
              <li>
                A valid payment method is required for paying accounts. Free accounts are not
                required to provide payment information.
              </li>
              <li>
                Subscriptions automatically renew unless cancelled at least 24 hours before the
                end of the current billing period.
              </li>
              <li>
                Refunds are processed in accordance with our refund policy. Contact support for
                refund requests within 14 days of charge.
              </li>
              <li>
                We reserve the right to modify pricing with 30 days' prior written notice.
              </li>
            </ul>
          </section>

          {/* 4. Data Ownership */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              4. Data Ownership
            </h2>
            <p>
              You retain all rights to, and ownership of, the data you upload, submit, or
              otherwise make available through the Service ("Your Data"). StockPilot does not
              claim any ownership over Your Data. We will not access, use, or share Your Data
              except as necessary to provide and improve the Service, or as required by law. You
              grant StockPilot a limited license to host, store, and process Your Data solely for
              the purpose of operating the Service.
            </p>
          </section>

          {/* 5. Termination */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              5. Termination
            </h2>
            <p className="mb-2">
              We may terminate or suspend your account and access to the Service immediately,
              without prior notice or liability, under our sole discretion, for any reason
              whatsoever, including but not limited to:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>A breach of these Terms of Service.</li>
              <li>Non-payment of any fees owed.</li>
              <li>
                Conduct that we determine, in our sole discretion, is harmful to other users,
                third parties, or the business interests of StockPilot.
              </li>
            </ul>
            <p className="mt-2">
              Upon termination, your right to use the Service will immediately cease. You may
              export Your Data within 30 days of termination, after which it may be permanently
              deleted.
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              6. Limitation of Liability
            </h2>
            <p>
              In no event shall StockPilot, its directors, employees, partners, agents,
              suppliers, or affiliates be liable for any indirect, incidental, special,
              consequential, or punitive damages, including without limitation, loss of profits,
              data, use, goodwill, or other intangible losses, resulting from (a) your access to
              or use of or inability to access or use the Service; (b) any conduct or content of
              any third party on the Service; (c) any content obtained from the Service; and (d)
              unauthorized access, use, or alteration of your transmissions or content. Our total
              liability for any claims under these terms shall not exceed the amount you paid us
              in the twelve (12) months preceding the claim.
            </p>
          </section>

          {/* 7. Governing Law */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              7. Governing Law
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of India,
              without regard to its conflict of law provisions. Any disputes arising under or in
              connection with these Terms shall be subject to the exclusive jurisdiction of the
              courts located in Bengaluru, Karnataka, India. Our failure to enforce any right or
              provision of these Terms will not be considered a waiver of those rights.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-lg border bg-muted/50 p-6">
            <h2 className="mb-2 text-base font-semibold text-foreground">
              Questions?
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{' '}
              <a
                href="mailto:legal@stockpilot.app"
                className="font-medium text-primary hover:underline"
              >
                legal@stockpilot.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
