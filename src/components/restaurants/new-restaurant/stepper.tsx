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
    <div className="flex flex-wrap items-center gap-4 md:gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {STEPS.map((item, index) => {
        const isCompleted =
          item.step === 1 && currentStep > 1 && isStepOneComplete;
        const isActive = currentStep === item.step;

        return (
          <div key={item.step} className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onStepSelect(item.step)}
              className="group inline-flex items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              <StepCircle
                step={item.step}
                isCompleted={isCompleted}
                isActive={isActive}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500">
                  Step {item.step}
                </span>
                <span
                  className={
                    isCompleted || isActive
                      ? 'text-base font-semibold text-gray-900'
                      : 'text-base font-medium text-gray-500'
                  }
                >
                  {item.label}
                </span>
              </div>
            </button>

            {index < STEPS.length - 1 ? (
              <div className="flex h-12 items-center">
                <svg className={`h-5 w-8 ${
                  isConnectorActive(item.step, currentStep, isStepOneComplete)
                    ? 'text-purple-500'
                    : 'text-gray-300'
                }`} fill="none" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 10L32 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M26 6L30 10L26 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
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
    'inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold shadow-sm transition-all';

  if (isCompleted) {
    return (
      <span className={`${baseStyles} bg-gradient-to-br from-purple-500 to-purple-600 text-white`}>
        <CheckIcon />
      </span>
    );
  }

  if (isActive) {
    return (
      <span className={`${baseStyles} bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-4 ring-purple-100`}>
        {step}
      </span>
    );
  }

  return (
    <span className={`${baseStyles} bg-gray-100 text-gray-500 border-2 border-gray-200`}>
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
