'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useManagedLocations } from '@/lib/use-managed-locations';
import { COLLABORATION_WIZARD_STEPS } from '@/lib/business/workspace/collaboration-form';
import { CollaborationWizardProgress } from './collaboration-form/CollaborationWizardProgress';
import { StepDetails } from './collaboration-form/StepDetails';
import { StepIntent } from './collaboration-form/StepIntent';
import { StepLocation } from './collaboration-form/StepLocation';
import { useCollaborationFormWizard } from './collaboration-form/useCollaborationFormWizard';

export function CreateCollaborationDialog({
  open,
  onOpenChange,
  hasServiceArea,
  businessCity,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasServiceArea: boolean;
  businessCity?: string;
  onCreated?: () => void;
}) {
  const { cities, isLoading: citiesLoading } = useManagedLocations();

  const wizard = useCollaborationFormWizard({
    open,
    businessCity,
    cities,
  });

  const handlePrimary = async () => {
    if (wizard.isLastStep) {
      const ok = await wizard.submit();
      if (ok) {
        onOpenChange(false);
        onCreated?.();
      }
      return;
    }
    wizard.goNext();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-3 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base">درخواست همکاری</DialogTitle>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {wizard.step.toLocaleString('fa-IR')} از{' '}
              {COLLABORATION_WIZARD_STEPS.length.toLocaleString('fa-IR')}
            </span>
          </div>
          {hasServiceArea ? <CollaborationWizardProgress step={wizard.step} /> : null}
          {hasServiceArea ? (
            <div>
              <p className="text-sm font-medium">{wizard.stepMeta.title}</p>
              <p className="text-xs text-muted-foreground">{wizard.stepMeta.hint}</p>
            </div>
          ) : null}
        </DialogHeader>

        {!hasServiceArea ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            ابتدا محدوده خدمات خود را در پروفایل کسب‌وکار تنظیم کنید.
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {wizard.step === 1 ? (
              <StepIntent value={wizard.draft.subjectKind} onChange={wizard.setSubjectKind} />
            ) : null}
            {wizard.step === 2 ? (
              <StepDetails
                dealType={wizard.draft.dealType}
                propertyKind={wizard.draft.propertyKind}
                areaBand={wizard.draft.areaBand}
                budgetBand={wizard.draft.budgetBand}
                onDealTypeChange={wizard.setDealType}
                onPropertyKindChange={wizard.setPropertyKind}
                onAreaBandChange={wizard.setAreaBand}
                onBudgetBandChange={wizard.setBudgetBand}
              />
            ) : null}
            {wizard.step === 3 ? (
              <StepLocation
                cities={cities}
                citiesLoading={citiesLoading}
                cityId={wizard.draft.cityId}
                targetAreas={wizard.draft.targetAreas}
                subjectKind={wizard.draft.subjectKind}
                previewHeadline={wizard.previewHeadline}
                onCityChange={wizard.setCityId}
                onTargetAreasChange={wizard.setTargetAreas}
              />
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 border-t px-4 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={wizard.submitting || wizard.step === 1}
            onClick={wizard.goBack}
          >
            قبلی
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={wizard.submitting}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!hasServiceArea || wizard.submitting || !wizard.canAdvance}
              onClick={() => void handlePrimary()}
              className="gap-1"
            >
              {wizard.submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : wizard.isLastStep ? (
                'انتشار'
              ) : (
                <>
                  بعدی
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
