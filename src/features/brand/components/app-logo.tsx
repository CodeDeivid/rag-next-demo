import type { ComponentProps } from "react";
import { cn } from "cn";

/** Citation brackets around two lines of excerpt: an answer quoting its source, "[≡]". */
const LOGO_MARK_PATH = "M7.5 4H5v16h2.5M16.5 4H19v16h-2.5M9.5 9h5M9.5 15h4";

export function AppLogoMark(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
      {...props}
    >
      <path d={LOGO_MARK_PATH} />
    </svg>
  );
}

export function AppLogo({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <AppLogoMark className="size-6 shrink-0" />
      <span className="font-heading font-semibold tracking-tight">RAG Next Demo</span>
    </span>
  );
}
