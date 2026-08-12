import Link from "next/link";
import type { ReactNode } from "react";

type PageIntroProps = {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
};

export default function PageIntro({
  title,
  description,
  backHref,
  backLabel,
  meta,
  actions,
  compact = false,
}: PageIntroProps) {
  return (
    <div
      className={`border-b border-zinc-200 ${
        compact
          ? "mb-4 pb-4 sm:mb-5 sm:pb-5 lg:mb-6"
          : "mb-5 pb-5 sm:mb-6 lg:mb-8 lg:pb-6"
      }`}
    >
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          ← {backLabel}
        </Link>
      )}
      <div className={`flex flex-wrap justify-between gap-4 ${compact ? "items-center" : "items-start"} ${backHref ? "mt-2" : ""}`}>
        <div className="min-w-0">
          <h1
            className={`font-extrabold tracking-tight text-zinc-950 ${
              compact ? "text-2xl sm:text-3xl" : "text-2xl sm:text-3xl lg:text-4xl"
            }`}
          >
            {title}
          </h1>
          {(description || meta) && (
            <div className={`${compact ? "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1" : ""}`}>
              {description && (
                <p className={`${compact ? "" : "mt-1.5"} text-sm leading-relaxed text-zinc-600`}>
                  {description}
                </p>
              )}
              {meta && (
                <div className={`${compact ? "" : "mt-1.5"} text-xs font-medium text-zinc-500`}>
                  {meta}
                </div>
              )}
            </div>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
