"use client";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 animate-element animate-delay-100">Terms and Conditions</h1>
        
        <div className="space-y-6 animate-element animate-delay-200">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Yoklick, you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to abide by the above, please do 
              not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Permission is granted to temporarily use Yoklick for personal, non-commercial 
              transitory viewing only. This is the grant of a license, not a transfer of title, 
              and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on Yoklick</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you create an account with us, you must provide accurate and complete information. 
              You are responsible for safeguarding the password and for all activities that occur 
              under your account.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
              <li>Generate content that is illegal, harmful, or objectionable</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Attempt to gain unauthorized access to our systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Yoklick offers various subscription plans. By subscribing, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Pay all fees associated with your chosen plan</li>
              <li>Provide accurate billing information</li>
              <li>Authorize us to charge your payment method</li>
              <li>Cancel your subscription at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All payments are processed securely through our payment partners. Refunds are 
              handled according to our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Content and Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of the thumbnails you generate using our service. However, 
              you grant us a license to use, store, and display your content as necessary to 
              provide our services.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for ensuring that your prompts and generated content do not 
              violate any third-party rights or applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to provide reliable service but cannot guarantee uninterrupted access. 
              We may temporarily suspend the service for maintenance or updates. We are not 
              liable for any damages resulting from service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall Yoklick or its suppliers be liable for any damages arising 
              out of the use or inability to use the materials on our website, even if we 
              or an authorized representative has been notified orally or in writing of the 
              possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also 
              governs your use of the service, to understand our practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and bar access to the service immediately, 
              without prior notice or liability, under our sole discretion, for any reason 
              whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these terms at any time. If a revision 
              is material, we will provide at least 30 days notice prior to any new terms 
              taking effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us at{" "}
              <a href="mailto:hello@yoklick.com" className="text-primary hover:underline">
                hello@yoklick.com
              </a>
            </p>
          </section>

          <section className="pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
