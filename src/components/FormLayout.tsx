import type { ReactNode } from "react";

export function FooterStep({ number }: { number: number }) {
  return (
    <p aria-current="step" className="text-center">
      Step {number}
    </p>
  );
}

export function ActionFooter({
  left,
  center,
  right,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right: ReactNode;
}) {
  return (
    <footer className="sticky bottom-0 z-20 mt-auto w-full shrink-0 border-t border-brio-subtle bg-brio-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 @min-[48rem]:grid @min-[48rem]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">{left}</div>
        <div className="-order-1 w-full text-xs text-brio-muted empty:hidden @min-[48rem]:order-none @min-[48rem]:col-start-2 @min-[48rem]:w-auto @min-[48rem]:text-center">
          {center}
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 @min-[48rem]:col-start-3">
          {right}
        </div>
      </div>
    </footer>
  );
}
