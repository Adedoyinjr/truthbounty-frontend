'use client';

import * as React from 'react';
import { ThumbsUp, ThumbsDown, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WeightSide {
  label: string;
  value: string | bigint | number | null;
  unit: string;
  icon: React.ReactNode;
  tone: 'success' | 'danger' | 'neutral';
  description?: string;
}

export interface StakeWeightDisplayProps {
  /** Supporting weight. */
  supporting: WeightSide;
  /** Opposing weight. */
  opposing: WeightSide;
  /** Total weight (optional, computed if not provided). */
  total?: string | bigint | number | null;
  /** Quorum weight (optional). */
  quorum?: string | bigint | number | null;
  /** Whether the data is provisional. */
  provisional?: boolean;
  /** Whether the data is stale. */
  stale?: boolean;
  /** Source of the weight data. */
  source?: string;
  /** Timestamp when weights were computed. */
  computedAt?: string;
  /** Show as compact horizontal layout. */
  compact?: boolean;
  /** Show the progress bars. */
  showBars?: boolean;
  /** Show the data table. */
  showTable?: boolean;
  /** Custom formatter for weight values. */
  formatWeight?: (value: string | bigint | number | null, unit: string) => string;
  /** Additional CSS classes. */
  className?: string;
}

const TONE_STYLES: Record<WeightSide['tone'], { bar: string; text: string }> = {
  success: { bar: 'bg-success', text: 'text-success' },
  danger: { bar: 'bg-destructive', text: 'text-destructive' },
  neutral: { bar: 'bg-muted-foreground/30', text: 'text-muted-foreground' },
};

function parseWeight(value: string | bigint | number | null): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  const str = value.toString().trim();
  if (!/^\d+$/.test(str)) return 0n;
  return BigInt(str);
}

/** Unit conversion rates in wei */
const UNIT_RATES: Record<string, bigint> = {
  wei: 1n,
  gwei: 1_000_000_000n,
  szabo: 1_000_000_000_000n,
  finney: 1_000_000_000_000_000n,
  ether: 1_000_000_000_000_000_000n,
};

/** Determine the appropriate unit for a given wei amount */
function getBestUnit(weiAmount: bigint): string {
  if (weiAmount === 0n) return 'wei';
  
  // Find the largest unit where weiAmount >= unit rate
  // Sort units by their rate using exact BigInt comparisons (largest to smallest)
  const units = Object.keys(UNIT_RATES).sort((a, b) => {
    const rateA = UNIT_RATES[a];
    const rateB = UNIT_RATES[b];
    return rateB < rateA ? -1 : rateB > rateA ? 1 : 0;
  });
  
  for (const unit of units) {
    const rate = UNIT_RATES[unit];
    if (weiAmount >= rate) {
      return unit;
    }
  }
  
  return 'wei';
}

/** Format wei amount to appropriate unit with lossless precision */
function formatWeightDefault(value: string | bigint | number | null, unit: string): string {
  const parsed = parseWeight(value);
  if (parsed === 0n) {
    return `0 ${unit}`;
  }
  
  // If custom unit provided, use it
  if (unit !== 'wei' && unit in UNIT_RATES) {
    const unitRate = UNIT_RATES[unit];
    const weiValue = parsed;
    
    // Calculate whole units and remainder
    const whole = weiValue / unitRate;
    const remainder = weiValue % unitRate;
    
    if (remainder === 0n) {
      return `${whole.toString()} ${unit}`;
    }
    
    // For fractional values, show full precision without scientific notation
    const fractionalStr = remainder.toString().padStart(unitRate.toString().length, '0');
    return `${whole.toString()}.${fractionalStr} ${unit}`;
  }
  
  // For wei, just show the raw amount
  if (unit === 'wei') {
    return `${parsed.toString()} wei`;
  }
  
  // Auto-select best unit for display
  const bestUnit = getBestUnit(parsed);
  const bestUnitRate = UNIT_RATES[bestUnit];
  
  const whole = parsed / bestUnitRate;
  const remainder = parsed % bestUnitRate;
  
  if (remainder === 0n) {
    return `${whole.toString()} ${bestUnit}`;
  }
  
  // For fractional values, show full precision without scientific notation
  const fractionalStr = remainder.toString().padStart(bestUnitRate.toString().length, '0');
  return `${whole.toString()}.${fractionalStr} ${bestUnit}`;
}

export function StakeWeightDisplay({
  supporting,
  opposing,
  total,
  quorum,
  provisional = false,
  stale = false,
  source,
  computedAt,
  compact = false,
  showBars = true,
  showTable = true,
  formatWeight = formatWeightDefault,
  className,
}: StakeWeightDisplayProps) {
  const supportingParsed = parseWeight(supporting.value);
  const opposingParsed = parseWeight(opposing.value);
  const totalParsed = total !== undefined ? parseWeight(total) : supportingParsed + opposingParsed;
  const quorumParsed = quorum !== undefined ? parseWeight(quorum) : null;

  const supportingPctInt = totalParsed > 0n ? Math.round((Number(supportingParsed * 10000n) * 10) / Number(totalParsed)) : 0;
  const opposingPctInt = totalParsed > 0n ? Math.round((Number(opposingParsed * 10000n) * 10) / Number(totalParsed)) : 0;
  const supportingPctDisplay = (supportingPctInt / 10).toFixed(1);
  const opposingPctDisplay = (opposingPctInt / 10).toFixed(1);
  
  // Quorum calculation
  const quorumReached = quorumParsed !== null && totalParsed >= quorumParsed;
  const quorumPctInt = quorumParsed !== null && totalParsed > 0n 
    ? Math.round((Number(totalParsed * 10000n) * 10) / Number(quorumParsed))
    : null;
  const quorumPctDisplay = quorumPctInt !== null ? (quorumPctInt / 10).toFixed(1) : null;

  const regionId = React.useId();
  const tableId = React.useId();

  const summaryParts = [
    `Supporting: ${formatWeight(supporting.value, supporting.unit)}`,
    `Opposing: ${formatWeight(opposing.value, opposing.unit)}`,
    `Total: ${formatWeight(totalParsed.toString(), supporting.unit)}`,
  ];
  if (quorumParsed !== null) {
    summaryParts.push(quorumReached ? 'Quorum reached' : `Quorum not reached (${formatWeight(quorumParsed.toString(), supporting.unit)} required)`);
  }
  if (provisional) summaryParts.push('Provisional — not finalized');
  if (stale) summaryParts.push('Data may be stale');
  if (source) summaryParts.push(`Source: ${source}`);
  if (computedAt) summaryParts.push(`Computed: ${new Date(computedAt).toLocaleString()}`);

  const supportingStyle = TONE_STYLES[supporting.tone];
  const opposingStyle = TONE_STYLES[opposing.tone];

  if (compact) {
    return (
      <div
        id={regionId}
        role="region"
        aria-label="Stake weights"
        aria-describedby={tableId}
        className={cn('flex flex-wrap items-center gap-4', className)}
      >
        <div className="flex items-center gap-2">
          <span className={cn('flex items-center gap-1', supportingStyle.text)}>
            <span aria-hidden="true">{supporting.icon}</span>
            <span className="font-mono tabular-nums">{formatWeight(supporting.value, supporting.unit)}</span>
            <span className="text-xs text-muted-foreground">({supportingPctDisplay}%)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('flex items-center gap-1', opposingStyle.text)}>
            <span aria-hidden="true">{opposing.icon}</span>
            <span className="font-mono tabular-nums">{formatWeight(opposing.value, opposing.unit)}</span>
            <span className="text-xs text-muted-foreground">({opposingPctDisplay}%)</span>
          </span>
        </div>
        {quorumParsed !== null && (
          <span className={cn('flex items-center gap-1 text-xs', quorumReached ? 'text-success' : 'text-warning')}>
            <span aria-hidden="true">{quorumReached ? '✓' : '⏳'}</span>
            <span>{quorumReached ? 'Quorum reached' : `Needs ${formatWeight(quorumParsed.toString(), supporting.unit)}`}</span>
          </span>
        )}
        {(provisional || stale) && (
          <span className="flex items-center gap-1 text-xs text-warning">
            <span aria-hidden="true">{provisional ? '⏳' : '⚠️'}</span>
            <span>{provisional ? 'Provisional' : 'Stale'}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      id={regionId}
      role="region"
      aria-label="Stake weights"
      aria-describedby={tableId}
      className={cn('space-y-4', className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">Stake Weights</h3>
        {(provisional || stale) && (
          <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium', provisional && 'bg-warning/10 text-warning border border-warning/30', stale && 'bg-destructive/10 text-destructive border border-destructive/30')}>
            <span aria-hidden="true">{provisional ? '⏳' : '⚠️'}</span>
            <span>{provisional ? 'Provisional' : 'Stale'}</span>
          </span>
        )}
      </div>

      {showBars && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <span aria-hidden="true">{supporting.icon}</span>
                {supporting.label}
              </span>
              <span className="font-mono tabular-nums">{formatWeight(supporting.value, supporting.unit)} ({supportingPctDisplay}%)</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${supporting.label} weight share`}
              aria-valuenow={Math.round((supportingPctInt * 10) / 10)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn('h-full transition-all duration-300', supportingStyle.bar)}
                style={{ width: `${Math.min(supportingPctInt, 1000)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <span aria-hidden="true">{opposing.icon}</span>
                {opposing.label}
              </span>
              <span className="font-mono tabular-nums">{formatWeight(opposing.value, opposing.unit)} ({opposingPctDisplay}%)</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${opposing.label} weight share`}
              aria-valuenow={Math.round((opposingPctInt * 10) / 10)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn('h-full transition-all duration-300', opposingStyle.bar)}
                style={{ width: `${Math.min(opposingPctInt, 1000)}%` }}
              />
            </div>
          </div>

          {quorumParsed !== null && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <span aria-hidden="true"><Scale size={12} /></span>
                  Quorum
                </span>
                <span className="font-mono tabular-nums">
                  {formatWeight(totalParsed.toString(), supporting.unit)} / {formatWeight(quorumParsed.toString(), supporting.unit)}
                  {quorumPctDisplay !== null && ` (${quorumPctDisplay}%)`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Quorum progress"
                aria-valuenow={quorumPctDisplay !== null ? Math.min(Math.round(parseFloat(quorumPctDisplay)), 100) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn('h-full transition-all duration-300', quorumReached ? 'bg-success' : 'bg-warning')}
                  style={{ width: `${quorumPctDisplay !== null ? Math.min(parseFloat(quorumPctDisplay), 100) : 0}%` }}
                />
              </div>
              <p className={cn('text-xs mt-1', quorumReached ? 'text-success' : 'text-warning')}>
                {quorumReached ? 'Quorum reached' : `Quorum not reached — needs ${formatWeight(quorumParsed.toString(), supporting.unit)}`}
              </p>
            </div>
          )}
        </div>
      )}

      <p
        id={tableId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {summaryParts.join('. ')}
      </p>

      {showTable && (
        <table
          className="w-full text-xs text-muted-foreground border-t border-border pt-2"
          role="table"
          aria-label="Stake weight details"
        >
          <thead>
            <tr>
              <th scope="col" className="text-left pb-1">Side</th>
              <th scope="col" className="text-right pb-1">Weight</th>
              <th scope="col" className="text-right pb-1">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/50">
              <td className="py-1 flex items-center gap-1">
                <span aria-hidden="true">{supporting.icon}</span>
                <span>{supporting.label}</span>
              </td>
              <td className="py-1 text-right font-mono tabular-nums">{formatWeight(supporting.value, supporting.unit)}</td>
              <td className="py-1 text-right font-mono tabular-nums">{supportingPctDisplay}%</td>
            </tr>
            <tr className="border-t border-border/50">
              <td className="py-1 flex items-center gap-1">
                <span aria-hidden="true">{opposing.icon}</span>
                <span>{opposing.label}</span>
              </td>
              <td className="py-1 text-right font-mono tabular-nums">{formatWeight(opposing.value, opposing.unit)}</td>
              <td className="py-1 text-right font-mono tabular-nums">{opposingPctDisplay}%</td>
            </tr>
            <tr className="border-t border-border/50 font-medium">
              <td className="py-1">Total</td>
              <td className="py-1 text-right font-mono tabular-nums">{formatWeight(totalParsed.toString(), supporting.unit)}</td>
              <td className="py-1 text-right">100%</td>
            </tr>
            {quorumParsed !== null && (
              <tr className="border-t border-border/50">
                <td className="py-1 flex items-center gap-1">
                  <span aria-hidden="true"><Scale size={12} /></span>
                  <span>Quorum Required</span>
                </td>
                <td className="py-1 text-right font-mono tabular-nums">{formatWeight(quorumParsed.toString(), supporting.unit)}</td>
                <td className="py-1 text-right">{quorumPctDisplay !== null ? `${quorumPctDisplay}%` : '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {(source || computedAt) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {source && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">📊</span>
              <span>Source: {source}</span>
            </span>
          )}
          {computedAt && (
            <time dateTime={computedAt} className="flex items-center gap-1">
              <span aria-hidden="true">🕐</span>
              <span>Computed {new Date(computedAt).toLocaleString()}</span>
            </time>
          )}
        </div>
      )}
    </div>
  );
}

export default StakeWeightDisplay;