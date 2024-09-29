import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { generateDefaultRequirementsBasedOnBusinessType } from '../../../accounts/onCreateUser';


interface IRequirement {
    name: string;
    enable: boolean;
    complete: boolean;
    type: string;
}

async function userWithoutRequirements(user: Meteor.User): Promise<unknown[]> {
    const { hasFunding, emails, IDVComplete } = user as Meteor.User & { hasFunding: boolean; emails: { verified: boolean }; IDVComplete: boolean };
    const defaultRequirements: IRequirement[] = generateDefaultRequirementsBasedOnBusinessType(user.business.industry);

    const requirements = defaultRequirements.map((requirement) => {
        if (requirement.name === 'IDV') return { ...requirement, enable: true, complete: IDVComplete };
        if (requirement.name === 'Bank') return { ...requirement, enable: true, complete: hasFunding };
        if (requirement.name === 'Email') return { ...requirement, enable: true, complete: emails[0].verified };
        return { ...requirement };
    });

    await Meteor.users.updateAsync({ _id: user._id }, { $set: { requirements } });
    return requirements;
}

export default async function getRequirements(userId: string): Promise<unknown[] | boolean> {
    check(userId, String);

    const user = await Meteor.users.findOneAsync({ _id: userId });
    if (!user) return false;

    if (!user.requirements) return await userWithoutRequirements(user);
    const requirements = user.requirements.filter((requirement: { enable: boolean }) => requirement.enable);


    return requirements;
} 