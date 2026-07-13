import type { RegionalFiling, RegionalFilingScraper } from '@prisma/client';

/** Product alias for Prisma `RegionalFiling` (persistence name unchanged). */
export type Filing = RegionalFiling;

/** Product alias for Prisma `RegionalFilingScraper`. */
export type FilingScraper = RegionalFilingScraper;

export type FilingAmenities = {
  parking: boolean;
  storage: boolean;
  elevator: boolean;
  securityDoor: boolean;
  exchangeable: boolean;
  terrace: boolean;
  builtInWardrobe: boolean;
  builtInGas: boolean;
};

export type FilingSourceMeta = {
  brokerOffice?: string | null;
  brokerPhone?: string | null;
  brokerAddress?: string | null;
  ownerAddress?: string | null;
  ownerPhone?: string | null;
  rawFeatures?: string | null;
  authenticated?: boolean;
  plotWidth?: string | null;
  landUse?: string | null;
  frontage?: string | null;
  commercialUse?: string | null;
};
