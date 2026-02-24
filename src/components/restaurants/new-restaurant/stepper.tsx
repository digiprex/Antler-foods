'use client';

type WizardStep = 1 | 2;

interface StepperProps {
  currentStep: WizardStep;
  isStepOneComplete: boolean;
  onStepSelect: (step: WizardStep) => void;
}

const STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: 'Restaurant info' },
  { step: 2, label: 'Business info' },
];

export function Stepper({
  currentStep,
  isStepOneComplete,
  onStepSelect,
}: StepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-5">
      {STEPS.map((item, index) => {
        const isCompleted =
          item.step === 1 && currentStep > 1 && isStepOneComplete;
        const isActive = currentStep === item.step;

        return (
          <div key={item.step} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onStepSelect(item.step)}
              className="inline-flex items-center gap-3 rounded-lg px-1 py-0.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#667eea]"
            >
              <StepCircle
                step={item.step}
                isCompleted={isCompleted}
                isActive={isActive}
              />
              <span
                className={
                  isCompleted || isActive
                    ? 'text-[17px] font-medium text-[#111827]'
                    : 'text-[17px] text-[#78838d]'
                }
              >
                {item.label}
              </span>
            </button>

            {index < STEPS.length - 1 ? (
              <div
                className={`h-px w-16 md:w-20 ${
                  isConnectorActive(item.step, currentStep, isStepOneComplete)
                    ? 'bg-[#8b9dff]'
                    : 'bg-[#dde5e9]'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface StepCircleProps {
  step: WizardStep;
  isCompleted: boolean;
  isActive: boolean;
}

function StepCircle({ step, isCompleted, isActive }: StepCircleProps) {
  const baseStyles =
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-lg';

  if (isCompleted) {
    return (
      <span className={`${baseStyles} bg-[#ede9fe] text-[#667eea]`}>
        <CheckIcon />
      </span>
    );
  }

  if (isActive) {
    return (
      <span className={`${baseStyles} bg-[#667eea] font-semibold text-white`}>
        {step}
      </span>
    );
  }

  return (
    <span className={`${baseStyles} bg-[#eceef0] font-semibold text-[#626f79]`}>
      {step}
    </span>
  );
}

function isConnectorActive(
  leftStep: WizardStep,
  currentStep: WizardStep,
  isStepOneComplete: boolean,
) {
  if (leftStep === 1) {
    return currentStep > 1 && isStepOneComplete;
  }

  return false;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}
