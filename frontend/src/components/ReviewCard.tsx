import { useState } from "react";
import { LuChevronDown, LuFileCode2 } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Review, FileReview, Comment } from "../types/review";

// Tailwind color classes — tests assert badge className contains "green", "yellow", etc.
const RISK_BADGE_CLASSES: Record<Review["riskLevel"], string> = {
  low:      "bg-green-100 text-green-800 border-green-200",
  medium:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  high:     "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_BADGE_CLASSES: Record<Comment["severity"], string> = {
  info:     "bg-blue-100 text-blue-800 border-blue-200",
  warning:  "bg-yellow-100 text-yellow-800 border-yellow-200",
  error:    "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

interface FileReviewSectionProps {
  fileReview: FileReview;
}

function FileReviewSection({ fileReview }: FileReviewSectionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* File header — toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "gp-file-header w-full flex items-center justify-between px-4 py-2.5 text-left",
          "border-none cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2">
          <LuFileCode2
            size={14}
            className="text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <span className="text-[13px] font-medium text-foreground font-mono">
            {fileReview.filename}
          </span>
        </div>
        <LuChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-150 shrink-0",
            isOpen ? "rotate-180" : "rotate-0"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul>
          {fileReview.comments.map((comment, idx) => (
            <li
              key={`${comment.severity}-${comment.line ?? "null"}-${idx}`}
              className={cn(
                "px-4 py-3 flex flex-col gap-1.5",
                idx > 0 && "border-t border-border"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-[11px] rounded",
                    SEVERITY_BADGE_CLASSES[comment.severity]
                  )}
                >
                  {comment.severity}
                </Badge>
                {comment.line !== null && (
                  <span className="text-xs text-muted-foreground">
                    Line {comment.line}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-foreground leading-relaxed">
                {comment.message}
              </p>
              {comment.suggestion !== null && (
                <p className="text-xs text-muted-foreground italic leading-snug">
                  {comment.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps): JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2
              data-testid="pr-title"
              className="text-[15px] font-medium text-foreground leading-snug"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {review.prTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              {review.repoOwner}/{review.repoName} #{review.prNumber}
            </p>
          </div>

          <Badge
            data-testid="risk-badge"
            className={cn(
              "shrink-0 capitalize text-xs rounded-full px-3 py-1",
              RISK_BADGE_CLASSES[review.riskLevel]
            )}
          >
            {review.riskLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Summary */}
        <p
          data-testid="review-summary"
          className="text-[13px] text-foreground leading-relaxed"
        >
          {review.summary}
        </p>

        {/* File reviews */}
        {review.fileReviews.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
              File Reviews
            </p>
            {review.fileReviews.map((fileReview) => (
              <FileReviewSection
                key={fileReview.filename}
                fileReview={fileReview}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
