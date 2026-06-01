// SPDX-License-Identifier: AGPL-3.0-or-later
interface PactChoiceProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** Radio-style choice used in the transparency pact onboarding step. */
export default function PactChoice({ label, selected, onClick }: PactChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-[10px] border bg-transparent px-4 py-3.5 text-left transition-colors ${
        selected ? 'border-ink bg-warm-100' : 'border-warm-300 hover:bg-warm-100'
      }`}
    >
      <span className="text-[14px] text-ink">{label}</span>
      <span
        className="h-4 w-4 rounded-full border"
        style={{
          borderColor: selected ? 'var(--color-ink)' : 'var(--color-warm-300)',
          background: selected ? 'var(--color-ink)' : 'transparent',
        }}
      />
    </button>
  );
}
