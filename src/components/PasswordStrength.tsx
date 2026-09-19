import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

const rules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Caractere especial (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordStrength(password: string) {
  const passed = rules.filter((r) => r.test(password)).length;
  return { passed, total: rules.length, isValid: passed === rules.length };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const results = useMemo(
    () => rules.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );

  const passed = results.filter((r) => r.passed).length;
  const percentage = (passed / rules.length) * 100;

  const barColor =
    percentage <= 20
      ? "bg-destructive"
      : percentage <= 60
      ? "bg-yellow-500"
      : percentage < 100
      ? "bg-blue-500"
      : "bg-green-500";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Rules checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {results.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            {r.passed ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={`text-[11px] ${
                r.passed ? "text-green-500" : "text-muted-foreground/70"
              }`}
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
