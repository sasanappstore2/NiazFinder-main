export type FilingFilterKind = 'chips' | 'range' | 'text' | 'date' | 'toggle';

export type FilingFilterOption = {
  value: string;
  label: string;
};

export type FilingFilterFieldSpec = {
  key: string;
  label: string;
  kind: FilingFilterKind;
  urlParam?: string;
  options?: FilingFilterOption[];
  placeholder?: string;
};

export type FilingFilterSpec = FilingFilterFieldSpec[];
