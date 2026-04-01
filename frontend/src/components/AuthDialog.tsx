import { useState, useEffect } from "react";
import { FaGithub } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AuthDialog(): JSX.Element {
  const { login, authError } = useAuth();
  const [open, setOpen] = useState(false);

  // Auto-open when redirected back with ?auth_error=true
  useEffect(() => {
    if (authError) setOpen(true);
  }, [authError]);

  function handleLogin() {
    setOpen(false);
    login();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full text-xs">
          Log In
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[380px]" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-[7px] bg-primary flex items-center justify-center shrink-0">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2.5 4h11M2.5 8h7.5M2.5 12h5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <DialogTitle
              className="text-[17px] font-medium tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              GitPulse
            </DialogTitle>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed pt-1">
            Sign in to save your review history across sessions and devices.
          </p>
        </DialogHeader>

        <div className="mt-4">
          {authError && (
            <p
              role="alert"
              className="mb-3 text-[12px] text-destructive text-center"
            >
              Sign-in failed. Please try again.
            </p>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleLogin}
            aria-label="Sign in with GitHub"
          >
            <FaGithub size={15} aria-hidden="true" />
            Sign in with GitHub
          </Button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Your existing anonymous reviews will be linked to your account.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
