import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TermsDialogProps {
  trigger: React.ReactNode;
}

export function TermsDialog({ trigger }: TermsDialogProps): JSX.Element {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-[13px] text-muted-foreground leading-relaxed">
          <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground">
            Last updated: April 2026
          </p>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Acceptance</h3>
            <p>
              By using GitPulse you agree to these terms. If you do not agree,
              please do not use the service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Use of the service</h3>
            <p>
              GitPulse provides AI-powered code review summaries for public
              GitHub pull requests. You may use the service for personal or
              professional purposes. You must not use it to review private
              repositories you do not have authorisation to access, or to
              circumvent GitHub&apos;s terms of service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">No warranties</h3>
            <p>
              GitPulse is provided &ldquo;as is&rdquo; without any warranty.
              AI-generated reviews may contain errors and should not be relied
              upon as the sole basis for merging or rejecting code. Always apply
              human judgement.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Limitation of liability</h3>
            <p>
              To the maximum extent permitted by law, GitPulse and its operators
              are not liable for any direct, indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Changes</h3>
            <p>
              We may update these terms at any time. Continued use of the
              service after changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
