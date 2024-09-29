import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import Security from '../utils/security';
import { ROLES } from '../consts/roles';

const rolesPanelOptions = [ROLES.ONBOARDING, ROLES.SALES, 'repetition', 'inbound', 'validation'];

const accessPanelOptions = ['validate', 'escalate', 'reactivate', 'bonus'];

function setRoles(userId, roles, group) {
  check(userId, String);
  check(group, String);
  check(roles, Array);

  const currentUserRoles = Roles.getRolesForUser(this.userId, group);

  if (roles.includes('super-admin') || currentUserRoles.includes('super-admin') !== roles.includes('super-admin')) {
    Security.checkRole(this.userId, ['super-admin']);
  } else {
    Security.checkRole(this.userId, ['super-admin', 'technical']);
  }

  const _group = group === 'global' ? Roles.GLOBAL_GROUP : group;

  Roles.setUserRoles(userId, roles, _group);
}

function setPanelRoles(userId, roles, group) {
  check(userId, String);
  check(group, String);
  check(roles, Array);

  Security.checkRole(this.userId, ['technical', 'admin', 'super-admin', 'manager', 'riskProfile']);

  const _group = group === 'global' ? Roles.GLOBAL_GROUP : group;

  const user = Meteor.users.findOne({ _id: userId });
  if (!user) throw new Meteor.Error('USER NOT FOUND');

  if (group === 'global') {
    const _roles = user.roles.__global_roles__;
    const rolesCleared = _roles.filter((item) => !rolesPanelOptions.includes(item));
    if (!roles.every((item) => rolesPanelOptions.includes(item))) {
      throw new Meteor.Error('ROLE NOT ALLOWED TO BE ADDED');
    } else {
      Roles.setUserRoles(userId, [...rolesCleared, ...roles], _group);
    }
  } else if (group === 'access') {
    const _roles = user.roles.access;
    const rolesCleared = _roles.filter((item) => !accessPanelOptions.includes(item));
    if (!roles.every((item) => accessPanelOptions.includes(item))) {
      throw new Meteor.Error('ACCESS NOT ALLOWED TO BE ADDED');
    } else {
      Roles.setUserRoles(userId, [...rolesCleared, ...roles], _group);
    }
  }
}

Meteor.methods({
  'roles.set': setRoles,
  'roles.panelRoles': setPanelRoles
});
