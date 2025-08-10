"use client";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  // 단계 텍스트에서 숫자 부분을 제거하는 함수
  const cleanStepLabel = (step: string) => {
    // "1. ", "2. ", "3. " 등의 패턴을 제거
    return step.replace(/^\d+\.\s*/, '');
  };

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
        >
          <div className="step-number">
            {index < currentStep ? '✓' : index + 1}
          </div>
          <div className="step-label">{cleanStepLabel(step)}</div>
        </div>
      ))}
    </div>
  );
}
