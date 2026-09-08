export const PERSONAL_VARIANTS = [
  { id: 'figure', number: '05', label: 'Figure', title: 'Engraved figure', description: 'One diagram cut into the bronze, with an inscription.' },
  { id: 'split', number: '01', label: 'Split', title: 'Split balance', description: 'A clear balance, with currency accounts alongside.' },
  { id: 'tiles', number: '02', label: 'Currency inlays', title: 'Currency inlays', description: 'A brass balance above three recessed glass displays.' },
  { id: 'activity', number: '03', label: 'Activity', title: 'Balance + activity', description: 'The balance and recent movement, side by side.' },
  { id: 'engraved', number: '04', label: 'Engraved', title: 'Direct on bronze', description: 'Large, quiet typography set into the bronze.' },
  { id: 'classic', number: '00', label: 'Balance sheet', title: 'Balance sheet', description: 'The balance and its currency rows in one glass sheet.' },
] as const

export type PersonalVariant = typeof PERSONAL_VARIANTS[number]['id']
