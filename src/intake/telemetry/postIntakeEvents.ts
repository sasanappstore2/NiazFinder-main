import type { FieldType } from '@/contracts/need-intake';

/** Wizard steps instrumented on /post (excludes transient publishing overlay). */
export type PostIntakeWizardStep =
  | 'compose'
  | 'need'
  | 'details'
  | 'location'
  | 'preview'
  | 'publishing'
  | 'done';

export type PostIntakeStepDirection = 'forward' | 'back' | 'jump';

export interface PostIntakeEventBase {
  sessionId: string;
  templateId: string;
  categorySlug?: string | null;
  timestamp: string;
}

export interface StepChangeEvent extends PostIntakeEventBase {
  type: 'step_change';
  fromStep: PostIntakeWizardStep | null;
  toStep: PostIntakeWizardStep;
  direction: PostIntakeStepDirection;
  durationOnPreviousStepMs?: number;
}

export interface FieldChangeEvent extends PostIntakeEventBase {
  type: 'field_change';
  step: PostIntakeWizardStep;
  fieldKey: string;
  fieldType: FieldType | string;
  changedFrom: unknown;
  changedTo: unknown;
  timeSpentOnFieldMs: number;
}

export interface ValidationErrorEvent extends PostIntakeEventBase {
  type: 'validation_error';
  step: PostIntakeWizardStep;
  field: string;
  message: string;
  source: 'publish_validator' | 'preview_gate' | 'wizard_gate';
}

export interface PublishAttemptEvent extends PostIntakeEventBase {
  type: 'publish_attempt';
  outcome: 'success' | 'fail';
  missingRequiredFields?: string[];
  errorField?: string;
  errorMessage?: string;
  autoApproved?: boolean;
  requestId?: string;
}

export interface DropoffEvent extends PostIntakeEventBase {
  type: 'dropoff';
  lastStep: PostIntakeWizardStep;
  reason: 'page_unmount' | 'navigation' | 'session_reset';
  durationOnLastStepMs: number;
  completionScore?: number;
}

export type PostIntakeEvent =
  | StepChangeEvent
  | FieldChangeEvent
  | ValidationErrorEvent
  | PublishAttemptEvent
  | DropoffEvent;

export interface PostIntakeTelemetryBatch {
  events: PostIntakeEvent[];
}
