import { Meteor } from 'meteor/meteor';
import Security from '../../utils/security';

Meteor.methods({
  backofficeVersion() {
    this.unblock();
    Security.checkIfAdmin(this.userId);

    return {
      commitHash: Meteor.gitCommitHash.substring(0, 7),
      platform: Meteor.release && Meteor.release.split('@')[1]
    };
  }
});
