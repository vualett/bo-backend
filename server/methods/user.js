import logger from '../logger/log';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles';
import { Backups } from '../collections/backups';
import createInvitation from './invitations/createInvitation';
import Security from '../utils/security';
import Invitations from '../collections/invitations';
import sendTwilioMessage from '../sms/sendTwilioMessage';
import updateInteraction from './users/updateInteraction';
import PromoCodes from '../collections/promoCodes';
import { insertNote } from '../methods/notes';
import { getStageUser } from '../methods/users/stageUser';
import insertLog from './logs/insertGenericLog';
import { asyncForEach, capitalizeFirstLetterOfEachWord } from '../utils/utils';
import * as Sentry from '@sentry/node';
import { insertTimelog } from './timelogs/insertTimelog';

// create admin account
function createAdminAccount(data, roles) {
  Security.checkRole(this.userId, ['super-admin', 'technical']);

  const newUserData = data;
  newUserData.isAdmin = true;

  if (roles && roles.includes('super-admin')) {
    Security.checkRole(this.userId, ['super-admin']);
  }

  try {
    const userId = Accounts.createUser(newUserData);
    Roles.addUsersToRoles(userId, roles || ['admin'], Roles.GLOBAL_GROUP);
  } catch (e) {
    logger.error(`[createAdminAccount] ${e}`);
    throw new Meteor.Error(500, e);
  }
}

function deleteUser(id) {
  Security.checkRole(this.userId, 'super-admin');

  const doc = Meteor.users.findOne({
    _id: id
  });

  doc.type = 'user';
  doc.old_id = doc._id;
  delete doc._id;

  if (Backups.insert(doc)) {
    Meteor.users.remove({
      _id: id
    });
  }
}

function forgotPassword(email) {
  check(email, String);
  const user = Accounts.findUserByEmail(email);
  if (!user) return false;
  const userId = user._id;
  if (userId) Accounts.sendResetPasswordEmail(userId, email);
  return true;
}

function updateUserField(userId, field, change, reason) {
  Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'manager', 'validation', 'riskProfile']);
  check(userId, String);
  check(field, String);
  const set = {};

  try {
    if (field === 'status.qualify') {
      if (change === false) {
        set['status.qualify'] = false;
        set['status.unqualifiedReason'] = reason || '';

        if (reason.toLowerCase() !== 'not interested' || reason.toLowerCase() !== 'agent') {
          set['status.verified'] = false;
          set['status.preVerified'] = false;
        }
      } else {
        set['status.qualify'] = true;
      }

      if (reason === 'not interested') {
        Meteor.call('timelogs.insert', {
          userId,
          event: 'not interested',
          type: 'account',
          eventType: 'user'
        });
      }
    } else if (field === 'category') {
      set.category = change.toLowerCase();

      const client = Meteor.users.findOne({ _id: userId });

      if (!client) {
        throw new Meteor.Error('Error', 'CLIENT_NOT_FOUND!');
      }

      if (client?.reactivationHold || client?.suspendedTill) {
        throw new Meteor.Error('Error', 'Have reactivation Hold active or suspended till active ');
      }
      Meteor.call(
        'notes.insert',
        {
          message: `PRODUCT CHANGED TO: ${set.category.toUpperCase()}`,
          where: 'user',
          userId
        },
        true
      );

      if (set.category === 'none') {
        updateInteraction({
          userId,
          status: 'deactivated',
          by: {
            name: 'system'
          },
          flow: 'repetition'
        });
      }

      Meteor.call('timelogs.insert', {
        userId,
        event: 'category changed',
        type: 'account',
        eventType: 'user',
        metadata: {
          category: set.category
        },
        _by:
          Meteor.user() !== undefined
            ? { id: Meteor.user()._id, name: `${Meteor.user().firstName} ${Meteor.user().lastName}` }
            : { id: 'system', name: 'system' }
      });
    } else if (field === 'canShare') {
      set.canShare = change;
    } else {
      return;
    }

    Meteor.users.update({ _id: userId }, { $set: set });
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[users.updateField] ${error}`);
    throw error;
  }
}

function setQualify(userId, change, reason) {
  Security.checkRole(this.userId, ['validation', 'super-admin', 'technical']);
  check(userId, String);
  const set = {};

  if (change === false) {
    set['status.qualify'] = false;
    set['status.unqualifiedReason'] = reason || '';

    if (reason.toLowerCase() !== 'not interested' || reason.toLowerCase() !== 'agent') {
      set['status.verified'] = false;
      set['status.preVerified'] = false;
    }

    Meteor.call('timelogs.insert', {
      userId,
      event: 'not qualified',
      type: 'account',
      eventType: 'user',
      metadata: {
        from: 'technical',
        reason
      }
    });
  } else {
    set['status.qualify'] = true;

    Meteor.call('timelogs.insert', {
      userId,
      event: 'qualify',
      type: 'account',
      eventType: 'user',
      metadata: {
        from: 'technical',
        reason
      }
    });
  }

  Meteor.users.update({ _id: userId }, { $set: set });
}
function removeIdv(userId) {
  Security.checkRole(this.userId, ['validation', 'super-admin', 'technical', 'riskProfile']);
  check(userId, String);

  const set = {
    IDVComplete: false,
    hasDriverLicense: false,
    'identityVerification.status': 'not started',

    'requirements.$.complete': false
  };
  const note = 'IDV REMOVE MANUALLY';
  insertNote({
    message: note,
    where: 'user',
    userId,
    by: Meteor.user() !== undefined ? { id: Meteor.user()._id, name: Meteor.user().firstName } : 'system'
  });

  Meteor.users.update(
    { _id: userId, 'requirements.name': 'IDV' },
    {
      $set: set
    }
  );
}
function invite(invitation) {
  Security.checkLoggedIn(Meteor.userId());
  const user = Meteor.users.findOne({ _id: Meteor.userId() });
  if (user && !user.status.verified) return false;

  if (invitation.constructor === Array) {
    const invitations = invitation;
    return invitations.map((i) => {
      try {
        return createInvitation({
          phone: i.phoneNumbers[0].number,
          by: Meteor.userId(),
          metadata: { name: `${i.givenName || ''} ${i.familyName || ''}` }
        });
      } catch (error) {
        logger.error(`[invite] ${error}`);
        return false;
      }
    });
  }
  return false;
}

function inviteContact(invitation) {
  Security.checkLoggedIn(Meteor.userId());
  const user = Meteor.users.findOne({ _id: Meteor.userId() });
  if (user && !user.status.verified) return false;

  return createInvitation({
    phone: invitation.phoneNumbers[0].number,
    by: Meteor.userId(),
    metadata: {
      name: `${invitation.givenName || ''} ${invitation.familyName || ''}`
    }
  });
}

function promoterAcceptTerms() {
  Meteor.users.update({ _id: Meteor.userId() }, { $set: { promoterTermsAccepted: true } });
}

function upgradeToPromoter(userId, type) {
  check(userId, String);
  Security.checkIfAdmin(this.userId);
  let isSubPromoter = false;
  let promoterType = 'normal';
  const user = Meteor.users.findOne({ _id: userId });

  if (user.invitedBy) {
    const referrer = Meteor.users.findOne({ _id: user.invitedBy });
    if (referrer) {
      if (referrer.isPromoter && referrer._id.substring(0, 2) !== 'A-') isSubPromoter = true;
    }
  }

  if (type) {
    if (type === 'normal') {
      return;
    }

    promoterType = type;
  }

  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        canShare: true,
        isPromoter: true,
        isSubPromoter,
        promoterSince: new Date(),
        promoterType
      }
    }
  );

  Meteor.call('timelogs.insert', {
    userId,
    event: 'upgrated to promoter',
    type: 'account',
    eventType: 'user'
  });

  sendTwilioMessage({
    body: 'Welcome to Ualett Promoter, here is your access: https://promoters.ualett.com',
    service: 'marketing',
    userId
  });
}

function disableToPromoter(userId) {
  check(userId, String);
  Security.checkIfAdmin(this.userId);
  const userInfo = Meteor.users.findOne({ _id: userId });
  PromoCodes.remove({ _id: userInfo.ownerPromoterCode });
  Meteor.users.update(
    { _id: userId },
    {
      $set: { canShare: false, isPromoter: false },
      $unset: {
        ownerPromoterCode: ''
      }
    }
  );

  Meteor.call('timelogs.insert', {
    userId,
    event: 'degraded from promoter',
    type: 'account',
    eventType: 'user'
  });
}

async function setUserStage(userId) {
  if (
    !(
      Boolean(Security.hasRole(Meteor.userId(), ['super-admin', 'technical'])) ||
      Boolean(Security.hasAccess(Meteor.userId(), ['setStage']))
    )
  )
    return;
  check(userId, String);

  try {
    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      throw new Meteor.Error(404, 'USER_NOT_FOUND!');
    }

    const stageUser = await getStageUser(user);

    if (!stageUser) {
      throw new Meteor.Error(404, 'STAGE_NOT_FOUND!');
    }

    const updated = await Meteor.users.updateAsync({ _id: user._id },
      {
        $set: {
          'offStage.stage': stageUser,
          'offStage.manually': true
        }
      }
    );

    if (!updated) {
      throw new Meteor.Error('STAGE_NOT_UPDATED!');
    }

    insertLog(user._id, `Stage changed to (${stageUser})`, Meteor.userId());

    await insertTimelog({
      userId: user._id,
      dealId: null,
      event: `Stage changed to ${stageUser}`,
      type: 'account',
      eventType: 'user',
      _by: Meteor.userId()
        ? {
          name: capitalizeFirstLetterOfEachWord(`${Meteor.user().firstName} ${Meteor.user().lastName}`),
          id: Meteor.userId()
        }
        : { name: 'system', id: 'system' },
      metadata: null
    });

    return true;
  } catch (error) {
    logger.error(`users.setUserStage ${userId} [${error}]`);
    throw error;
  }
}

Meteor.methods({
  'users.promoter.acceptTerms': promoterAcceptTerms,
  'users.updateField': updateUserField,
  'users.setQualify': setQualify,
  'users.removeIDV': removeIdv,
  'users.upgradeToPromoter': upgradeToPromoter,
  'users.disablePromoter': disableToPromoter,
  'user.forgotPassword': forgotPassword,
  'user.delete': deleteUser,
  'users.admin.create': createAdminAccount,
  'users.invite': invite,
  'users.inviteContact': inviteContact,
  'users.getNameById': function getName(id) {
    check(id, String);
    Security.checkLoggedIn(this.userId);
    const user = Meteor.users.findOne({ _id: id });
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`;
  },
  'users.myReferals': function myReferals() {
    Security.checkLoggedIn(this.userId);
    const referals = Invitations.find({ by: this.userId }).fetch() || [];
    return referals;
  },
  'users.setDisableState': function setDisableState(userId) {
    check(userId, String);
    Security.checkRole(this.userId, ['super-admin', 'technical']);

    const set = {
      disabled: true,
      'status.verified': false,
      'status.preVerified': false,
      'status.qualify': false,
      'services.resume.loginTokens': [],
      'status.unqualifiedReason': 'suspended'
    };

    Meteor.users.update({ _id: userId }, { $set: set });

    Meteor.call('timelogs.insert', {
      userId,
      event: 'account suspended',
      type: 'account',
      eventType: 'user',
      metadata: {
        by: Meteor.userId(),
        type: 'suspended'
      }
    });
  },
  'users.setUserStage': setUserStage,
  'users.setStageForUsers': async function _setStageForUsers(startDate, endDate) {
    Security.checkRole(Meteor.userId(), ['super-admin', 'technical']);
    check(startDate, Date);
    check(endDate, Date);

    const notStagesFound = []; // users which stages could not be found

    try {
      const notStageUsers = await Meteor.users
        .find({
          type: 'user',
          isPromoter: { $exists: false },
          'offStage.stage': { $exists: false },
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        })
        .fetchAsync();

      if (!notStageUsers.length) {
        throw new Meteor.Error(404, 'USERS_NOT_FOUND!');
      }

      await asyncForEach(notStageUsers, async (user) => {
        const stageUser = await getStageUser(user);

        if (!stageUser) {
          notStagesFound.push(user._id);
        }
        else {
          await Meteor.users.updateAsync({ _id: user._id },
            {
              $set: {
                'offStage.stage': stageUser,
                'offStage.manually': true
              }
            }
          );

          insertLog(user._id, `Stage changed to (${stageUser})`, Meteor.userId());

          await insertTimelog({
            userId: user._id,
            dealId: null,
            event: `Stage changed to ${stageUser}`,
            type: 'account',
            eventType: 'user',
            _by: Meteor.userId()
              ? {
                name: capitalizeFirstLetterOfEachWord(`${Meteor.user().firstName} ${Meteor.user().lastName}`),
                id: Meteor.userId()
              }
              : { name: 'system', id: 'system' },
            metadata: null
          });
        }
      });

      return {
        results: `successfully changed ${notStageUsers.length - notStagesFound.length} of ${notStageUsers.length}.`,
        stagesCouldBeFound: notStagesFound
      };
    } catch (error) {
      logger.error(`[users.setStageForUsers] ${error}`);
      throw error;
    }
  }
});
