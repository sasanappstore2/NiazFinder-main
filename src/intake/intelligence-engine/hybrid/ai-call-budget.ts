/** Max AI provider invocations per analyze (gist + scoped fill / disambig). */
export const INTAKE_AI_CALL_BUDGET = 2;

export class AiCallBudget {
  private used = 0;
  constructor(private readonly max = INTAKE_AI_CALL_BUDGET) {}

  get remaining(): number {
    return Math.max(0, this.max - this.used);
  }

  get exhausted(): boolean {
    return this.used >= this.max;
  }

  /** Reserve one call slot; returns false if budget exhausted. */
  tryConsume(): boolean {
    if (this.exhausted) return false;
    this.used += 1;
    return true;
  }

  snapshot(): { used: number; max: number; remaining: number } {
    return { used: this.used, max: this.max, remaining: this.remaining };
  }
}
