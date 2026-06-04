/** Legal entity metadata — replace placeholders before production launch. */
export const LEGAL_ENTITY = {
  brandName: 'نیاز فایندر',
  legalName: '[نام رسمی شرکت — تکمیل شود]',
  registrationId: '[شناسه ملی / شماره ثبت — تکمیل شود]',
  address: '[آدرس کامل — تکمیل شود]',
  email: 'info@needfinder.ir',
  phone: '021-91000000',
  governingLaw: 'جمهوری اسلامی ایران',
  jurisdiction: 'مراجع صالح در تهران',
  effectiveDate: '1404/03/12',
  version: '1.0',
} as const;

export function isLegalEntityPending(): boolean {
  return (
    LEGAL_ENTITY.legalName.includes('تکمیل شود') ||
    LEGAL_ENTITY.registrationId.includes('تکمیل شود') ||
    LEGAL_ENTITY.address.includes('تکمیل شود')
  );
}
