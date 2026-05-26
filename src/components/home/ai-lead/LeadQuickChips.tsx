'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LEAD_ACTION_CHIPS, type LeadChipDefinition, type LeadChipId } from './ai-lead-chips';

export interface LeadQuickChipsProps {
  hasCity: boolean;
  cityName?: string;
  isGeoDetecting?: boolean;
  onChipAction: (id: LeadChipId) => void;
}

const LOCATION_CHIP_IDS = new Set<LeadChipId>(['pick-city', 'geo']);
const PRIMARY_CHIP_IDS = new Set<LeadChipId>(['browse-needs']);

function ChipControl({
  chip,
  label,
  disabled,
  variant,
  highlighted,
  index,
  onClick,
}: {
  chip: LeadChipDefinition;
  label: string;
  disabled?: boolean;
  variant: 'location' | 'primary' | 'secondary';
  highlighted?: boolean;
  index: number;
  onClick: () => void;
}) {
  const Icon = chip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.34,
        delay: index * 0.055,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'h-[34px] gap-2 rounded-[13px] px-[13px] text-xs font-medium transition-all duration-200',
          variant === 'location' &&
            'border-border/50 bg-background/70 hover:border-primary/30 hover:bg-primary/5',
          variant === 'primary' &&
            highlighted &&
            'border-primary/40 bg-primary/10 text-primary shadow-[0_0_21px_-8px_oklch(var(--primary)/0.4)] hover:bg-primary/15',
          variant === 'primary' &&
            !highlighted &&
            'border-border/50 bg-muted/30 text-muted-foreground',
          variant === 'secondary' &&
            'border-border/40 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
      </Button>
    </motion.div>
  );
}

export function LeadQuickChips({
  hasCity,
  cityName,
  isGeoDetecting,
  onChipAction,
}: LeadQuickChipsProps) {
  const browseLabel =
    hasCity && cityName ? `نیازهای ${cityName}` : 'مشاهده نیازها';

  const locationChips = LEAD_ACTION_CHIPS.filter((c) =>
    LOCATION_CHIP_IDS.has(c.id)
  );
  const actionChips = LEAD_ACTION_CHIPS.filter(
    (c) => !LOCATION_CHIP_IDS.has(c.id)
  );

  let chipIndex = 0;

  return (
    <div className="mt-[21px] space-y-[13px]">
      <p className="text-center text-[11px] font-medium text-muted-foreground/90">
        میانبرها
      </p>

      {/* Location row — lower cognitive load, grouped */}
      <div
        className="flex flex-wrap items-center justify-center gap-[8px] rounded-[13px] border border-dashed border-border/40 bg-muted/15 px-[13px] py-[8px]"
        role="group"
        aria-label="تنظیم مکان"
      >
        {locationChips.map((chip) => {
          const disabled = chip.id === 'geo' && isGeoDetecting;
          const idx = chipIndex++;
          return (
            <ChipControl
              key={chip.id}
              chip={chip}
              label={chip.label}
              disabled={disabled}
              variant="location"
              highlighted={false}
              index={idx}
              onClick={() => onChipAction(chip.id)}
            />
          );
        })}
      </div>

      {/* Conversion row — primary CTA stands out when city set */}
      <div
        className="flex flex-wrap items-center justify-center gap-[13px]"
        role="group"
        aria-label="ادامه مسیر"
      >
        {actionChips.map((chip) => {
          const disabled = chip.requiresCity && !hasCity;
          const label =
            chip.id === 'browse-needs' ? browseLabel : chip.label;
          const variant = PRIMARY_CHIP_IDS.has(chip.id) ? 'primary' : 'secondary';
          const highlighted =
            chip.id === 'browse-needs' && hasCity && !disabled;
          const idx = chipIndex++;

          return (
            <ChipControl
              key={chip.id}
              chip={chip}
              label={label}
              disabled={disabled}
              variant={variant}
              highlighted={highlighted}
              index={idx}
              onClick={() => onChipAction(chip.id)}
            />
          );
        })}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/75">
        رایگان · بدون تعهد · پاسخ از کسب‌وکارهای همان شهر
      </p>
    </div>
  );
}
