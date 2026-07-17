import Link from "next/link";
import type { ReactNode } from "react";

type PageIntroProps = {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export default function PageIntro({
  title,
  description,
  backHref,
  backLabel,
  meta,
  actions,
}: PageIntroProps) {
  return (
    <div className="mb-5 border-b border-zinc-200 pb-5 sm:mb-6">
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="ui-back-link"
        >
          ← {backLabel}
        </Link>
      )}
      <div className={`flex flex-wrap items-start justify-between gap-4 ${backHref ? "mt-2" : ""}`}>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{description}</p>
          )}
          {meta && <div className="mt-1.5 text-xs font-medium text-zinc-400">{meta}</div>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
