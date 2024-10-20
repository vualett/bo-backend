import { CategoryTypes } from './server/methods/users/categorization';

declare module 'meteor/natestrauser:publish-performant-counts';

declare module 'meteor/meteor' {
  namespace Meteor {
    interface User {
      _id: string;
      firstName: string;
      lastName: string;
      emails?: UserEmail[];
      phone: { number: string; others?: Array<{ number: string }> };
      dwollaCustomerURL?: string;
      dwollaFundingURL?: string;
      verifiedDate: Date;
      plaidAccessToken: string;
      IDVComplete: boolean;
      hasFunding: boolean;
      identityVerification: {
        status: string;
      };
      address: {
        state: string;
        city: string;
        postal_code: string;
        street1: string;
        street2: string;
      };
      IDVMatch: {
        total: number;
      };
      createdAt?: Date;
      suspendedTill?: Date;
      invitedBy: string;
      categoryType: CategoryTypes;
      categorySince?: Date;
      requirements: Document[];
      oncall: boolean;
      category: string;
      status: {
        verified?: boolean;
        qualify?: boolean;
        unqualifiedReason?: string;
        lastLogin: {
          date: Date;
          ipAddr: string;
        };
      };
      lastCall?: {
        type: string;
        callType: string;
        callDuration: number;
        userId: string;
        timestamp: Date;
        who: {
          id: string;
          name: string;
        };
      };
      metrics: {
        cashAdvances: {
          count: number;
          totalPaid?: number;
          totalTaken?: number;
        };
      };
      previousCategory?: string;
      isAdmin?: boolean;
      roles?: {
        __global_roles__: string[];
        access: string[];
      };
      deletedAt?: Date;
      hasMatches?: boolean;
      matchesFound?: Array<{
        userID: string;
      }>;
      disabled?: boolean;
      plaidAssetReport: Array<{ assetReportId: string; assetReportToken: string; requestedAt: Date; inDB: string }>;
      deleteRequest?: Date;
      promotionDetail?: {
        _id: string;
        count: number;
      };
      invited: Date;
      argyle: {
        id?: string;
        user_token: string;
        accounts: ArgyleAccount[];
      };
      offStage: {
        stage: string;
        status: string;
        subStatus: string;
        needMoreInfoDate?: Date;
      };
      assignedAgent: Array<{
        category: string;
        agent: {
          firstName: string;
          lastName: string;
          id: string;
        };
        timestamp: Date;
        by: {
          name: string;
          id?: string;
        };
      }>;
      business: {
        industry: string;
      };
      assignCount?: number;
      blockAddBankAccount: boolean;
      canSyncArgyle: boolean;
      currentCashAdvance: {
        activeAt: Date;
        amount: number;
        approvedAt: Date;
        createdAt: Date;
        id: string;
        preApprovedAt: Date;
        status: DealStatus;
      };
    }

    type DealStatus = 'active' | 'requested' | 'completed' | 'suspended' | 'approved' | 'closed';
    interface AssetReport {
      _id: string;
      asset_report_id: string;
      client_report_id: string;
      date_generated: Date;
      days_requested: number;
      items: Item[];
      user: User;
    }

    interface SettingProducts {
      _id: string;
      products: Array<{
        category: string;
        products: Array<{
          amount: number;
          options: Array<{
            name: string;
            numberOfPayments: number;
            termsOfPayment: number;
            fee: number[];
          }>;
        }>;
      }>;
    }

    export interface Item {
      accounts: Account[];
      date_last_updated: Date;
      institution_id: string;
      institution_name: string;
      item_id: string;
    }

    interface Account {
      account_id: string;
      balances: Balances;
      days_available: number;
      historical_balances: HistoricalBalance[];
      mask: string;
      name: string;
      official_name: null | string;
      owners: Owner[];
      ownership_type: null;
      subtype: string;
      transactions: Transaction[];
      type: string;
    }
    interface Owner {
      addresses: Address[];
      emails: EmailOwner[];
      names: string[];
      phone_numbers: EmailOwner[];
    }
    interface EmailOwner {
      data: string;
      primary: boolean;
      type: string;
    }
    interface Address {
      data: Data;
      primary: boolean;
    }
    interface Data {
      city: string;
      country: string;
      postal_code: string;
      region: string;
      street: string;
    }

    interface Balances {
      available: number | null;
      current: number;
      iso_currency_code: ISOCurrencyCode;
      limit: number | null;
      margin_loan_amount: null;
      unofficial_currency_code: null;
    }

    enum ISOCurrencyCode {
      Usd = 'USD'
    }
    interface HistoricalBalance {
      current: number;
      date: Date;
      iso_currency_code: ISOCurrencyCode;
      unofficial_currency_code: null;
    }
    interface Transaction {
      account_id: string;
      amount: number;
      date: Date;
      iso_currency_code: ISOCurrencyCode;
      original_description: string;
      pending: boolean;
      transaction_id: string;
      unofficial_currency_code: null;
    }

    interface Payment {
      status: string;
      number: number;
      date: Date;
      originalDate?: Date;
      amount: number;
      bonus?: number;
      principal: number;
      fee: number;
      idempotencyKey: string;
      skip?: boolean;
      initiatedAt?: Date;
      directDeposit?: boolean;
      directDepositReference?: string;
      attempts: number;
      returnCode: string;
      isGrouped?: boolean;
    }
    interface Metrics {
      _id: string;
      month: {
        totalMonth: number;
        monthPush: number;
        monthRepetition: number;
      };
      week: {
        totalWeek: number;
        weekPush: number;
        weekRepetition: number;
      };
      toDay: number;
      newDeals: number;
      initialBalance?: {
        balance: number;
        lastUpdated: Date;
      };
      currentBalance?: {
        balance: number;
        lastUpdated: Date;
      }
    }
    interface Deal {
      feeAmount: number;
      numberOfPayment: any;
      fee: number;
      _id: string;
      userId: string;
      status: DealStatus;
      amount: number;
      readjustedCount: number;
      metrics: { rescheduledPayments: number; failedPayments: number };
      completeAt: Date;
      payments: Payment[];
      firstDeal: boolean;
      transferChannel: string;
      idempotencyKey: string;
      referralBonusApplied: boolean;
      dateInOverdue?: Date;
      toCollection?: boolean;
      autoRescheduleCount: number;
      transferUrl?: string;
      debitChannel?: string;
      assignedAgent: Array<{
        category: string;
        agent: {
          firstName: string;
          lastName: string;
          id: string;
        };
        timestamp: Date;
        by: {
          name: string;
          id: string;
        };
      }>;
    }

    interface Backups {
      reason: string;
      documentType: string;
      doc: Meteor.User;
      timestamp: Date;
      by: string;
    }
    interface Promotion {
      name: string;
      description: string;
      maxInvitation: number;
      limitDateOfDayInvitation: number;
      dateStart: Date;
      dateEnd: Date;
      validInvitationCount: number;
    }

    interface DataChangesLogs_payment {
      status: string;
      number: number;
      date: Date;
      amount: number;
      principal: number;
      fee: number;
      idempotencyKey: string;
      bonus?: number;
      initiatedAt?: Date;
      initiatedBy?: string;
      transferUrl?: string;
      transfers?:
        | Array<{
            status: string;
            transferUrl: string;
            initiatedAt: Date;
          }>
        | false;
      paidAt?: Date;
    }

    interface DataChangesLog {
      _id?: string;
      where: string;
      documentID: string;
      operation: string;
      method: string;
      createdBy: string;
      old_data: DataChangesLogs_payment[];
      new_data: DataChangesLogs_payment[];
      createdAt?: Date;
    }

    interface Task {
      _id: string;
      issueId: string;
      issueKey: string;
      typeOfIssue: string;
      colName: string;
      docId: string;
      createdAt: Date;
      metadata: {
        numberOfDeclinedPayments: number;
        declinedPayments?: Array<{
          number: number;
          code: string;
          paid: boolean;
        }>;
      };
    }
    interface Invitations {
      _id: string;
      phone:
        | string
        | Array<{
            number: string;
            type: string;
          }>;
      status: string;
      used: boolean;
      userId: string;
      by: string;
      referral: object;
      when: Date;
      metadata: object;
      assignedAgent: {
        category: string;
        agent: {
          firstName: string;
          lastName: string;
          id: string;
        };
        timestamp: Date;
        by: {
          name: string;
          id: string;
        };
      };
    }
  }

  interface Document {
    name: string;
    enable: boolean;
    complete: boolean;
    type: string;
  }

  interface Documents {
    userId: string;
    ETag: string;
    ServerSideEncryption: string;
    Location: string;
    Key: string;
    Bucket: string;
    date: Date;
    DocumentName: string;
  }

  interface ArgyleReports {
    userId: string;
    id: string;
    create_at: Date;
    reference_id?: string;
    generated_at: Date;
    type?: string;
    user: string;
    status?: string;
    file_url?: string;
    metadata: { income_totals: unknown; accounts: unknown };
  }

  interface ArgyleConnection {
    status: string;
    errorCode: null | string;
    errorMessage: null | string;
    updatedAt: Date;
  }
  interface ArgyleAccount {
    id: string;
    employers: string[];
    source: string;
    item: string;
    createdAt: Date;
    updatedAt: Date;
    scannedAt: Date;
    connection: ArgyleConnection;
  }
}

declare module 'moneysafe';

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}
