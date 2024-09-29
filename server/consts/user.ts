export const STAGE = {
  ONBOARDING: {
    STAGE_1: '01. Account Created (MAL)',
    STAGE_2: '02. Identity Verified (MQL)',
    STAGE_3: '03. Email Verified'
  },
  UNDERWRITING: {
    STAGE_4: '04. Account Complete - Waiting to be evaluated',
    STAGE_5: '05. Evaluating',
    STAGE_9: '09. 1st MCA Complete'
  },
  SALES: {
    STAGE_6: '06. UW Approved - awaiting customer request',
    STAGE_7: '07. Approved - Customer requests 1st Advance',
    STAGE_8: '08. Transferred In Process - ACH'
  },
  RELATIONSHIP_MANAGEMENT: {
    STAGE_10: '10. Repeat Client'
  }
} as const;

export const STATUS = {
  NEED_MORE_INFO: 'need more info',
  APPROVED: 'approved',
  UNQUALIFIED_NOT_ELIGIBLE: 'unqualified - not eligible',
  UNQUALIFIED_ELIGIBLE_FOR_RE_EVAL: 'unqualified - eligible for re-eval',
  IDV_NOT_STARTED: 'idv not started',
  IDV_IN_PROGRESS: 'idv in progress',
  IDV_ERROR: 'idv error',
  IDV_PENDING_REVIEW: 'idv pending review',
  IDV_FAILED: 'idv failed',
  LOST: 'lost',
  CALL_IN_FUTURE: 'call in future',
  VERIFICATION_IN_PROGRESS: 'verification in process',
  INVALID_CUSTOMER_EMAIL: 'invalid customer email',
  EMAIL_NOT_STARTED: 'not started',
  CUSTOMER_STUCK: 'customer stuck',
  INFO_SUBMITTED: 'info submitted',
  NOT_INTERESTED: 'not interested',
  REEVALUATION_NOTICE: 'reevaluation notice',
  SCHEDULED_DEACTIVATION: 'scheduled deactivation',
  DEACTIVATED_CUSTOMER: 'deactivated customer',
  REACTIVATION: 'reactivation',
  SALES_ASSISTING_CUSTOMER: 'sales assisting customer',
  TRANSFER_REQUEST_BLOCKED: 'transfer request blocked',
  ACTIVE_DIRECT_DEPOSIT: 'active - direct deposit',
  ACTIVE_REMITTANCE_FAILED: 'active - remittance failed',
  ACTIVE_NO_ISSUES: 'active - no issues',
  DWOLLA_UNLINKS: 'dwolla unlinks',
  CALLBACK_SCHEDULED: 'callback scheduled',
  DEACTIVATED: 'deactivated',
  REACTIVATION_REQUEST: 'reactivation request',
  WAITING_FOR_CLIENT_REQUEST: 'waiting for client request',
  APPROVED_DEAL_IN_PROCESS: 'approved deal in process',
  UPGRADE: 'upgrade'
} as const;

export const SUB_STATUS = {
  BROKER: 'broker',
  IDV_FRAUD: 'idv fraud',
  OVERDUE: 'overdue',
  DUPLICATE_ACCOUNT: 'duplicated',
  RELATED_TO_CLIENT_IN_OVERDUE: 'related to client in od/collections',
  NO_INDEPENDENT_CONTRACTOR_DRIVER: 'no independent contractor driver',
  NOT_ENOUGH_DRIVER_INCOME: 'not enough driver income',
  NOT_ENOUGH_DAILY_BALANCE: 'not enough daily balance',
  CURRENTLY_IN_OVERDRAFT: 'currently in overdraft',
  OVERDRAFT_BEHAVIOR: 'overdraft behavior',
  SUSPENDED: 'suspended',
  UNDERAGE: 'underage',
  NOT_ENOUGH_INCOMES: 'not enough incomes',
  NOT_INTERESTED: 'not interested',
  STUCK_NOT_RESPONDING: 'stuck, not responding',
  NOT_RESPONDING: 'not responding',
  IDV_NOT_ELIGIBLE_NO_USA_DOC: 'idv - not eligible for follow up - no usa doc',
  IDV_NOT_ELIGIBLE_UNDERAGE: 'idv - not eligible for follow up - underage',
  SCHEDULE_WITH_CUSTOMER: 'schedule with customer',
  NOT_READY_TO_RESCHEDULE: 'not ready to reschedule',
  UNSUPPORTED_BANK: 'unsupported bank',
  BANK_SIGN_ISSUES: 'bank sign in issues',
  DEFAULTED: 'defaulted',
  SERVICINGS_DEFAULTED: 'servicings/defaulted',
  INFORMATION_NEEDED_NOT_PROVIDED: 'information needed not provided',
  GIG_INCOME_VERIFICATION_IN_PROGRESS: 'gig income verification in progress',
  BUSINESS_PROOF_OF_OWNERSHIP: 'business proof of ownership',
  BANK_OR_TAX_ITEMS: 'bank or tax items',
  WRONG_INFO: 'wrong info',
  CALL_IN_FUTURE: 'call in future',
  KYC_CHECK: 'kyc_check',
  SELFIE_CHECK: 'selfie_check',
  DOCUMENTARY_VERIFICATION: 'documentary_verification',
  RISK_CHECK: 'risk_check',
  MULTIPLE_ERRORS: 'multiple errors',
  ADVANCE_REMITTANCE: 'advance remittance',
  TRUE_UP: 'true - up',
  NEGOTIATION: 'negotiation',
  UNRECOVERABLE: 'unrecoverable',
  FAILED_ON_R01: 'failed on r01',
  FAILED_IN_OTHER_ACH_ERROR_CODES: 'failed in other ach error codes',
  AUTOMATIC_TRUE_UP: 'automatic true - up',
  REMITTANCE_IN_PROCESS: 'remittance in process',
  SUCCESSFULL_REMITTANCE: 'successful remittance',
  RM_ASSISTING_CLIENT_ROUND_1: 'rm assisting client - round 1',
  RM_ASSISTING_CLIENT_ROUND_2: 'rm assisting client - round 2',
  RM_ASSISTING_CLIENT_ROUND_3_PLUS: 'rm assisting client - round 3+',
  ACTION_NEEDED: 'action needed',
  NEED_MORE_INFO: 'need more info',
  EVALUATING: 'evaluating',
  WAITING_FOR_UW_REVIEW: 'waiting for uw review',
  TRANSFER_PENDING: 'transfer pending',
  TRANSFER_IN_PROCESS: 'transfer in process',
  TRANSFER_FAILED: 'transfer failed',
  NO_LONGER_INDEPENDENT_CONTRACTOR_DRIVER: 'no longer independent contractor/driver',
  BANKRUPTCY: 'bankruptcy',
  HIGH_RISK: 'high risk'
} as const;

export const PLAID_STATUS = {
  ACTIVE: 'active',
  SUCCESS: 'success',
  PENDING_REVIEW: 'pending_review',
  FAILED: 'failed'
} as const;

export const ROLE = {
  RELATIONSHIP_MANAGEMENT: 'relationship_management',
  SALES: 'sales',
  UNDERWRITING: 'underwriting',
  VALIDATION: 'validation',
  ONBOARDING: 'onboarding',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  OVERDUE: 'overdue',
  FINANCIAL: 'financial',
  MANAGER: 'manager',
  AUDIT: 'audit',
  INBOUND: 'inbound',
  REPETITION: 'repetition',
  QA: 'qa'
} as const;

export const STAGE_BY_ROLE_ASSIGNMENT = {
  [STAGE.ONBOARDING.STAGE_1]: ROLE.ONBOARDING,
  [STAGE.ONBOARDING.STAGE_2]: ROLE.ONBOARDING,
  [STAGE.ONBOARDING.STAGE_3]: ROLE.ONBOARDING,
  [STAGE.UNDERWRITING.STAGE_4]: ROLE.ONBOARDING,
  [STAGE.UNDERWRITING.STAGE_5]: ROLE.SALES,
  [STAGE.SALES.STAGE_6]: ROLE.SALES,
  [STAGE.SALES.STAGE_7]: ROLE.SALES,
  [STAGE.SALES.STAGE_8]: ROLE.SALES,
  [STAGE.UNDERWRITING.STAGE_9]: ROLE.SALES,
  [STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10]: ROLE.REPETITION
};
