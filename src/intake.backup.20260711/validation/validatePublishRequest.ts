import type { ListingPreview, NeedDraft, PublishValidationError } from '@/contracts/need-intake';
import {
  validateNeedDraftForPublish,
  type PublishValidationResult,
} from '@/intake/validation/publishValidator';
import {
  rejectListingTitleReason,
  truncateListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';

const DESCRIPTION_MIN = 40;

export type { PublishValidationResult };

/** Client + server publish gate — draft rules + listing preview (no AI assessment). */
export function validatePublishRequest(
  draft: NeedDraft | null | undefined,
  listingPreview?: ListingPreview | null
): PublishValidationResult {
  if (!draft?.entities || !draft.templateId) {
    return {
      success: false,
      errors: [{ field: 'needDraft', message: 'پیش‌نویس نامعتبر است' }],
    };
  }

  const draftResult = validateNeedDraftForPublish(draft);
  if (!draftResult.success) {
    return draftResult;
  }

  if (!listingPreview) {
    return { success: true, errors: [] };
  }

  const previewTitle = truncateListingTitle(
    String(listingPreview.title ?? '').trim() || 'ثبت نیاز'
  );
  const titleReject = rejectListingTitleReason(previewTitle, {
    sourceText: draft.sourceText,
  });
  if (titleReject) {
    return {
      success: false,
      errors: [
        {
          field: 'listingPreview.title',
          message: 'عنوان آگهی برای انتشار مناسب نیست — لطفاً عنوان مشخص‌تری بنویسید',
        },
      ],
    };
  }

  const description = String(listingPreview.description ?? '').trim();
  if (description.length < DESCRIPTION_MIN) {
    return {
      success: false,
      errors: [
        {
          field: 'listingPreview.description',
          message: `توضیحات حداقل ${DESCRIPTION_MIN} کاراکتر باشد`,
        },
      ],
    };
  }

  return { success: true, errors: [] };
}

export function toPublishValidationJson(result: PublishValidationResult): {
  success: false;
  errors: PublishValidationError[];
} {
  return {
    success: false,
    errors: result.errors.map((e) => ({
      field: e.field,
      message: e.message,
    })),
  };
}
