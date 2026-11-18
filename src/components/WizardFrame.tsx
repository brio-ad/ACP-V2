import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, cx } from "./ui";
import { ActionFooter, FooterStep } from "./FormLayout";

export function WizardFrame({
  stepNumber,
  onBack,
  onExit,
  children,
  footerRight,
  fitTable = false,
}: {
  stepNumber: number;
  onBack: () => void;
  onExit?: () => void;
  children: ReactNode;
  footerRight: ReactNode;
  fitTable?: boolean;
}) {
  return (
    <div className={cx("flex min-w-0 flex-1 flex-col", fitTable && "min-h-min")}>
      <div className={cx("min-w-0 flex-1 p-5", fitTable && "flex min-h-min flex-col")}>
        {children}
      </div>
      <ActionFooter
        left={
          <>
            <Button onClick={onBack} icon={<ArrowLeft className="size-4" aria-hidden />}>
              Back
            </Button>
            {onExit && (
              <Button variant="ghost" onClick={onExit}>
                Exit
              </Button>
            )}
          </>
        }
        center={<FooterStep number={stepNumber} />}
        right={footerRight}
      />
    </div>
  );
}

export function StepHeading({
  title,
  description,
  className = "mb-4",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-brio-title font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-brio-muted">{description}</p>
    </div>
  );
}
