export type LayaCorpusDuplicateGroup = {
  firstLine: number;
  rowCount: number;
  targetFingerprint: string;
  conflict: boolean;
};

export class LayaCorpusDedupIndex {
  private readonly groups = new Map<string, LayaCorpusDuplicateGroup>();

  observe(textFingerprint: string, targetFingerprint: string, line: number): {
    firstOccurrence: boolean;
    conflictingTarget: boolean;
  } {
    const group = this.groups.get(textFingerprint);
    if (!group) {
      this.groups.set(textFingerprint, {
        firstLine: line,
        rowCount: 1,
        targetFingerprint,
        conflict: false,
      });
      return { firstOccurrence: true, conflictingTarget: false };
    }

    group.rowCount += 1;
    const conflictingTarget = group.targetFingerprint !== targetFingerprint;
    if (conflictingTarget) group.conflict = true;
    return { firstOccurrence: false, conflictingTarget };
  }

  get(textFingerprint: string): LayaCorpusDuplicateGroup | undefined {
    return this.groups.get(textFingerprint);
  }

  get uniqueTextGroups(): number {
    return this.groups.size;
  }

  get conflictingTextGroups(): number {
    let count = 0;
    for (const group of this.groups.values()) if (group.conflict) count += 1;
    return count;
  }

  get rowsInConflictingGroups(): number {
    let count = 0;
    for (const group of this.groups.values()) if (group.conflict) count += group.rowCount;
    return count;
  }
}
