import { Roles } from 'meteor/alanning:roles';
import { Meteor } from 'meteor/meteor';

export default class Security {
  static checkRole(userId, role) {
    if (!this.hasRole(userId, role)) {
      throw new Meteor.Error('NOT-AUTHORIZED', 'You are not authorized');
    }
  }

  static checkHasAllRoles(userId, roles) {
    if (!this.hasAllRoles(userId, roles)) {
      throw new Meteor.Error('NOT-AUTHORIZED', 'You are not authorized');
    }
  }

  static hasAllRoles(userId, roles) {
    return roles?.every((role) => Roles.userIsInRole(userId, [role, 'super-admin']));
  }

  static hasRole(userId, role) {
    return Roles.userIsInRole(userId, [...role, 'super-admin']);
  }

  static hasExplicitRole(userId, role) {
    return Roles.userIsInRole(userId, role);
  }

  static hasAccess(userId, role) {
    return Roles.userIsInRole(userId, role, 'access');
  }

  static checkAccess(userId, role) {
    if (!this.hasAccess(userId, role)) {
      return this.checkRole(userId, 'super-admin');
    }
  }

  static checkLoggedIn(userId) {
    if (!userId) {
      throw new Meteor.Error('NOT-AUTHORIZED', 'You are not authorized');
    }
  }

  static checkIfAdmin(userId) {
    const user = Meteor.users.findOne({ _id: userId });
    if (!user || !user.isAdmin) throw new Meteor.Error('NOT-AUTHORIZED', 'You are not authorized');
  }
}
