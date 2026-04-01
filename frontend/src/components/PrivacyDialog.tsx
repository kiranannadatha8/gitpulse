import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PrivacyDialogProps {
  trigger: React.ReactNode;
}

export function PrivacyDialog({ trigger }: PrivacyDialogProps): JSX.Element {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-[13px] text-muted-foreground leading-relaxed">
          <p className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground">
            Last updated: April 2026
          </p>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">What we collect</h3>
            <p>
              When you sign in with GitHub, we store your GitHub username, display
              name, email address (if public), and avatar URL. We also store the
              PR reviews you request, including the PR URL and AI-generated
              analysis.
            </p>
            <p>
              We use a session cookie (<code className="text-foreground">connect.sid</code>) to
              keep you logged in. Anonymous users also receive this cookie so
              review history is preserved across visits.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">How we use it</h3>
            <p>
              Your data is used solely to provide the GitPulse service — storing
              and displaying your review history. We do not sell or share your
              data with third parties. PR diffs are sent to OpenAI for analysis;
              refer to{" "}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-foreground"
              >
                OpenAI&apos;s Privacy Policy
              </a>{" "}
              for how they handle that data.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Your rights</h3>
            <p>
              You can export all data we hold about you or permanently delete
              your account at any time from the user menu. Deletion removes your
              profile and all associated reviews immediately and irreversibly.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Cookies</h3>
            <p>
              We use a single session cookie for authentication and anonymous
              session tracking. No third-party tracking or advertising cookies
              are set.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-[13px] font-medium text-foreground">Contact</h3>
            <p>
              Questions? Open an issue on{" "}
              <a
                href="https://github.com/kiranannadatha8/gitpulse"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-foreground"
              >
                GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
