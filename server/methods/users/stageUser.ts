/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
import { Meteor } from 'meteor/meteor';
import { STAGE } from '../../consts/user';
import Deals from '../../collections/deals';

function isStage1(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    !user.IDVComplete &&
    (!user.hasFunding || user.hasFunding) &&
    (!hasEmailVerified || hasEmailVerified) &&
    !user.status?.verified &&
    !user.currentCashAdvance &&
    user.metrics.cashAdvances.count === 0
  ) {
    return true;
  }
  return false;
}

function isStage2(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);

  if (
    user.IDVComplete &&
    !hasEmailVerified &&
    (!user.hasFunding || user.hasFunding) &&
    !user.status?.verified &&
    !user.currentCashAdvance &&
    user.metrics.cashAdvances.count === 0
  ) {
    return true;
  }
  return false;
}

function isStage3(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    !user.hasFunding &&
    !user.status?.verified &&
    !user.currentCashAdvance &&
    user.metrics.cashAdvances.count === 0
  ) {
    return true;
  }
  return false;
}

function isStage4(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    user.hasFunding &&
    !user.status?.verified &&
    !user.currentCashAdvance &&
    user.metrics.cashAdvances.count === 0 &&
    !user.plaidAssetReport
  ) {
    return true;
  }
  return false;
}

function isStage5(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    user.hasFunding &&
    user.plaidAssetReport &&
    !user.status?.verified &&
    !user.currentCashAdvance &&
    (!user.status.qualify || user.status.qualify) &&
    user.metrics.cashAdvances.count === 0
  ) {
    return true;
  }
  return false;
}

function isStage6(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    user.hasFunding &&
    user.plaidAssetReport &&
    !user.currentCashAdvance &&
    user.metrics?.cashAdvances?.count === 0 &&
    (user.status?.verified || user.verifiedDate)
  ) {
    return true;
  }
  return false;
}

function isStage7(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    user.hasFunding &&
    user.plaidAssetReport &&
    user.metrics?.cashAdvances?.count === 0 &&
    user.currentCashAdvance?.status === 'requested' &&
    (user.status?.verified || user.verifiedDate)
  ) {
    return true;
  }
  return false;
}

function isStage8(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    user.hasFunding &&
    user.plaidAssetReport &&
    user.metrics?.cashAdvances?.count === 0 &&
    user.currentCashAdvance?.status === 'approved' &&
    (user.status?.verified || user.verifiedDate)
  ) {
    return true;
  }
  return false;
}

function isStage9(user: Meteor.User): boolean {
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (
    user.IDVComplete &&
    hasEmailVerified &&
    user.hasFunding &&
    user.metrics?.cashAdvances?.count === 1 &&
    (user.status?.verified || user.verifiedDate) &&
    ['active', 'cancelled', 'suspended', 'closed'].includes(user.currentCashAdvance?.status)
  ) {
    return true;
  }
  return false;
}

function isStage10(user: Meteor.User): boolean {
  const userDeal = Deals.findOne({ userId: user._id });
  const hasEmailVerified = user.emails?.find((i) => i.verified);
  if (user.IDVComplete && hasEmailVerified && user.hasFunding && (user.status?.verified || user.verifiedDate)) {
    if (user.metrics?.cashAdvances?.count === 1 && userDeal?.status === 'completed') {
      return true;
    }
    if (user.metrics?.cashAdvances?.count > 1) {
      return true;
    }
    return false;
  }
  return false;
}

export function getStageUser(user: Meteor.User): string | null {
  if (isStage1(user)) {
    return STAGE.ONBOARDING.STAGE_1;
  } else if (isStage2(user)) {
    return STAGE.ONBOARDING.STAGE_2;
  } else if (isStage3(user)) {
    return STAGE.ONBOARDING.STAGE_3;
  } else if (isStage4(user)) {
    return STAGE.UNDERWRITING.STAGE_4;
  } else if (isStage5(user)) {
    return STAGE.UNDERWRITING.STAGE_5;
  } else if (isStage6(user)) {
    return STAGE.SALES.STAGE_6;
  } else if (isStage7(user)) {
    return STAGE.SALES.STAGE_7;
  } else if (isStage8(user)) {
    return STAGE.SALES.STAGE_8;
  } else if (isStage9(user)) {
    return STAGE.UNDERWRITING.STAGE_9;
  } else if (isStage10(user)) {
    return STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10;
  }
  return null;
}
