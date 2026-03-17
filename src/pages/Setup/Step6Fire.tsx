import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button, Input } from '../../components/ui';

interface Step6FireProps {
  onNext: () => void;
  onBack: () => void;
}

// Sub-steps: 0=target, 1=annual expenses, 2=monthly contribution, 3=return assumptions
type SubStep = 0 | 1 | 2 | 3;

const SUB_STEPS: SubStep[] = [0, 1, 2, 3];

export default function Step6Fire({ onNext, onBack }: Step6FireProps) {
  const [subStep, setSubStep] = useState<SubStep>(0);

  // Sub-step 0
  const [target, setTarget] = useState('');

  // Sub-step 1
  const [annualExpenses, setAnnualExpenses] = useState('');

  // Sub-step 2
  const [monthlyContribution, setMonthlyContribution] = useState('');

  // Sub-step 3
  const [expectedReturn, setExpectedReturn] = useState('7');
  const [withdrawalRate, setWithdrawalRate] = useState('4');

  const setFireTarget   = useSettingsStore((s) => s.setFireTarget);
  const setFireProfile  = useSettingsStore((s) => s.setFireProfile);

  // ── Commit everything and advance the wizard ────────────────────────────
  const finish = (opts: { skipAll?: boolean } = {}) => {
    if (!opts.skipAll) {
      setFireTarget(parseFloat(target) || null);
      setFireProfile({
        annualExpenses:      annualExpenses      ? parseFloat(annualExpenses)      : null,
        monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : null,
        expectedReturn:      expectedReturn      ? parseFloat(expectedReturn)      : 7,
        withdrawalRate:      withdrawalRate      ? parseFloat(withdrawalRate)      : 4,
      });
    }
    onNext();
  };

  const skipAll = () => {
    setFireTarget(null);
    finish({ skipAll: true });
  };

  const advanceSub = () => {
    if (subStep < 3) setSubStep((subStep + 1) as SubStep);
    else finish();
  };

  const backSub = () => {
    if (subStep === 0) onBack();
    else setSubStep((subStep - 1) as SubStep);
  };

  // ── Sub-step 0: FIRE Target ─────────────────────────────────────────────
  if (subStep === 0) {
    const isValid = parseFloat(target) > 0;
    return (
      <div className="text-center space-y-8 max-w-sm mx-auto">
        <div>
          <p className="text-white/30 text-sm mb-2">FIRE setup · 1 of 4</p>
          <h1 className="text-4xl font-bold text-white mb-2">What's your retirement savings goal?</h1>
          <p className="text-white/50 text-sm">The total amount you need to retire. You can calculate this precisely later in the FIRE Calculators.</p>
        </div>

        <Input
          type="number"
          label="FIRE target"
          placeholder="1,000,000"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          hint="Total portfolio value needed to retire"
        />

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} fullWidth>Back</Button>
          <Button variant="primary" onClick={advanceSub} disabled={!isValid} fullWidth>Continue</Button>
        </div>

        <button onClick={skipAll} className="text-white/35 text-sm hover:text-white/60 transition-colors underline underline-offset-2">
          I don't have a target yet
        </button>
      </div>
    );
  }

  // ── Sub-step 1: Annual Expenses ─────────────────────────────────────────
  if (subStep === 1) {
    return (
      <div className="text-center space-y-8 max-w-sm mx-auto">
        <div>
          <p className="text-white/30 text-sm mb-2">FIRE setup · 2 of 4</p>
          <h1 className="text-4xl font-bold text-white mb-2">How much do you spend per year?</h1>
          <p className="text-white/50 text-sm">Used to calculate your FIRE number using the safe withdrawal rate. Pre-fills the FIRE calculators.</p>
        </div>

        <Input
          type="number"
          label="Annual living expenses"
          placeholder="50,000"
          value={annualExpenses}
          onChange={(e) => setAnnualExpenses(e.target.value)}
          hint="Your total yearly spending"
        />

        <div className="flex gap-3">
          <Button variant="ghost" onClick={backSub} fullWidth>Back</Button>
          <Button variant="primary" onClick={advanceSub} fullWidth>Continue</Button>
        </div>

        <button onClick={finish} className="text-white/35 text-sm hover:text-white/60 transition-colors underline underline-offset-2">
          Skip remaining setup
        </button>
      </div>
    );
  }

  // ── Sub-step 2: Monthly Contribution ────────────────────────────────────
  if (subStep === 2) {
    return (
      <div className="text-center space-y-8 max-w-sm mx-auto">
        <div>
          <p className="text-white/30 text-sm mb-2">FIRE setup · 3 of 4</p>
          <h1 className="text-4xl font-bold text-white mb-2">How much do you save each month?</h1>
          <p className="text-white/50 text-sm">Your total monthly investment or savings contribution, used to project time to FIRE.</p>
        </div>

        <Input
          type="number"
          label="Monthly contribution"
          placeholder="2,000"
          value={monthlyContribution}
          onChange={(e) => setMonthlyContribution(e.target.value)}
          hint="Amount invested or saved each month"
        />

        <div className="flex gap-3">
          <Button variant="ghost" onClick={backSub} fullWidth>Back</Button>
          <Button variant="primary" onClick={advanceSub} fullWidth>Continue</Button>
        </div>

        <button onClick={finish} className="text-white/35 text-sm hover:text-white/60 transition-colors underline underline-offset-2">
          Skip remaining setup
        </button>
      </div>
    );
  }

  // ── Sub-step 3: Return assumptions ──────────────────────────────────────
  return (
    <div className="text-center space-y-8 max-w-sm mx-auto">
      <div>
        <p className="text-white/30 text-sm mb-2">FIRE setup · 4 of 4</p>
        <h1 className="text-4xl font-bold text-white mb-2">Investment assumptions</h1>
        <p className="text-white/50 text-sm">These defaults are widely used. You can adjust them anytime in the FIRE calculators.</p>
      </div>

      <div className="space-y-4">
        <Input
          type="number"
          label="Expected annual return (%)"
          placeholder="7"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value)}
          hint="Historical stock market average is ~7% real return"
        />
        <Input
          type="number"
          label="Safe withdrawal rate (%)"
          placeholder="4"
          value={withdrawalRate}
          onChange={(e) => setWithdrawalRate(e.target.value)}
          hint="The 4% rule is the most common starting point"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={backSub} fullWidth>Back</Button>
        <Button variant="primary" onClick={() => finish()} fullWidth>Finish setup</Button>
      </div>

      <button onClick={finish} className="text-white/35 text-sm hover:text-white/60 transition-colors underline underline-offset-2">
        Skip remaining setup
      </button>
    </div>
  );
}
