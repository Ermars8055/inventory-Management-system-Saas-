import { Link } from 'react-router-dom';

export function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Last updated: September 20, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          {/* 1. Data Collection */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              1. Data Collection
            </h2>
            <p className="mb-2">
              StockPilot ("we", "us", "our") collects information that you provide directly when
              you use our inventory management platform. This includes:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Account Information:</strong> Name, email address, phone number,
                organization name, and role when you register for an account.
              </li>
              <li>
                <strong>Inventory Data:</strong> Product details, stock levels, vendor
                information, transaction records, and other operational data you enter into the
                platform.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you interact with the Service,
                including pages visited, features used, timestamps, and device information.
              </li>
              <li>
                <strong>Payment Information:</strong> Billing details processed through our
                third-party payment provider. We do not store full credit card numbers on our
                servers.
              </li>
            </ul>
          </section>

          {/* 2. Data Usage */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              2. Data Usage
            </h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Process transactions and send related information, including confirmations and invoices.</li>
              <li>Improve, personalize, and expand the Service.</li>
              <li>Communicate with you, including for customer support, updates, and marketing (with your consent).</li>
              <li>Detect, prevent, and address technical issues and security threats.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          {/* 3. Data Storage */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              3. Data Storage
            </h2>
            <p>
              Your data is stored on secure servers with industry-standard encryption at rest
              (AES-256) and in transit (TLS 1.2+). We retain your personal data only for as long
              as necessary to fulfil the purposes outlined in this policy, or as required by law.
              Inventory and transaction data is retained for the duration of your account and for
              a period of 90 days following account deletion to allow for data recovery requests.
              Backups are maintained in geographically distributed data centres to ensure
              availability and disaster recovery.
            </p>
          </section>

          {/* 4. Data Sharing */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              4. Data Sharing
            </h2>
            <p className="mb-2">
              We do not sell your personal data. We may share your information only in the
              following circumstances:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Service Providers:</strong> With trusted third-party vendors who assist
                in operating the Service (e.g., hosting, analytics, payment processing), bound
                by confidentiality agreements.
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, regulation, legal
                process, or governmental request.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                sale of assets, with prior notice to affected users.
              </li>
              <li>
                <strong>With Your Consent:</strong> When you have given us explicit permission to
                share your information for a specified purpose.
              </li>
            </ul>
          </section>

          {/* 5. User Rights */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              5. User Rights
            </h2>
            <p className="mb-2">
              You have the following rights regarding your personal data:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Right to Access:</strong> You may request a copy of the personal data we
                hold about you at any time by contacting our support team or using the data
                export feature in your account settings.
              </li>
              <li>
                <strong>Right to Deletion:</strong> You may request the deletion of your personal
                data. Upon receiving a verified request, we will delete your data within 30 days,
                except where retention is required by law.
              </li>
              <li>
                <strong>Right to Export:</strong> You may export your inventory data, transaction
                history, and account information in standard formats (CSV, JSON) through the
                platform's built-in export functionality.
              </li>
              <li>
                <strong>Right to Correction:</strong> You may update or correct inaccurate
                personal data through your account settings or by contacting us.
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Where processing is based on consent,
                you may withdraw it at any time without affecting the lawfulness of prior
                processing.
              </li>
            </ul>
          </section>

          {/* 6. Cookies */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              6. Cookies
            </h2>
            <p className="mb-2">
              We use cookies and similar tracking technologies to enhance your experience:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Essential Cookies:</strong> Required for authentication, security, and
                core functionality. These cannot be disabled.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how users interact with
                the Service so we can improve it. These are only set with your consent.
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings and preferences
                (e.g., language, theme) across sessions.
              </li>
            </ul>
            <p className="mt-2">
              You can manage your cookie preferences at any time through your browser settings.
              For more information, see our cookie consent banner.
            </p>
          </section>

          {/* 7. DPDPA Compliance */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              7. Compliance with India's DPDPA
            </h2>
            <p>
              StockPilot is committed to complying with the Digital Personal Data Protection Act,
              2023 (DPDPA) of India. In accordance with the DPDPA, we act as a "Data Fiduciary"
              and process your personal data only for lawful purposes with your consent or as
              permitted under the Act. We have implemented appropriate technical and
              organisational measures to protect personal data, maintain transparency about our
              data practices, and provide mechanisms for you to exercise your rights as a "Data
              Principal", including the right to access, correct, and erase your data. We appoint
              a Data Protection Officer and provide a grievance redressal mechanism as required
              by the Act. If you believe your data rights have been violated, you may raise a
              complaint with the Data Protection Board of India.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              8. Contact
            </h2>
            <div className="rounded-lg border bg-muted/50 p-6">
              <p className="mb-3">
                If you have questions, concerns, or requests regarding this Privacy Policy or
                your personal data, please contact us:
              </p>
              <ul className="space-y-1">
                <li>
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:privacy@stockpilot.app"
                    className="font-medium text-primary hover:underline"
                  >
                    privacy@stockpilot.app
                  </a>
                </li>
                <li>
                  <strong>Data Protection Officer:</strong>{' '}
                  <a
                    href="mailto:dpo@stockpilot.app"
                    className="font-medium text-primary hover:underline"
                  >
                    dpo@stockpilot.app
                  </a>
                </li>
              </ul>
              <p className="mt-3">
                We will respond to all data-related requests within 30 days.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
