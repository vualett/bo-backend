import { Meteor } from 'meteor/meteor';
import Security from '../../../utils/security';
import getRequirements from './getRequirements';
import { check } from 'express-validator';


Meteor.methods({
    'users.getRequirements': async function getRequirementsMethod() {
        Security.checkLoggedIn(Meteor.userId());
        return await getRequirements(Meteor.userId() as string);
    },
    'users.getRequirementsForUser': async function getRequirementsMethod(userId: string) {
        check(userId, String);
        Security.checkIfAdmin(Meteor.userId());
        return await getRequirements(userId);
    },
});
