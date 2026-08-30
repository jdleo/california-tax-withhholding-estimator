export interface PersonFlags {
  age65: boolean;
  blind: boolean;
}

export const FED_STD_DEDUCTION: Record<string, number> = {
  single: 16100,
  mfj: 32200,
  mfs: 16100,
  hoh: 24150,
  qss: 32200,
};

export const CA_STD_DEDUCTION: Record<string, number> = {
  single: 5706,
  mfj: 11412,
  mfs: 5706,
  hoh: 11412,
  qss: 11412,
};

export const FED_ADDL_STD_PER_CONDITION = 1600;
export const FED_ADDL_STD_PER_CONDITION_MFS = 800;
export const SENIOR_BONUS_DEDUCTION = 6000;
export const SENIOR_BONUS_PHASEOUT = { single: 75000, mfj: 150000 } as const;
export const CTC = {
  perChild: 2200,
  refundablePerChild: 1700,
  phaseoutStep: 50,
  per1000: 1000,
  phaseoutStart: { single: 200000, mfj: 400000 },
} as const;
export const OTHER_DEPENDENT_CREDIT = 500;
export const DEPENDENT_STD_FLOOR = 1350;
export const DEPENDENT_STD_EARNED_ADD = 450;
export const CA_MENTAL_HEALTH_RATE = 0.01;
export const CA_MENTAL_HEALTH_THRESHOLD = 1000000;
export const CA_EXEMPTION_CREDITS = { personal: 159, dependent: 462, senior: 145, blind: 145 };
export const DEFAULT_VEST_WITHHOLDING_PCT = 40;
