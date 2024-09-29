import { Meteor } from 'meteor/meteor';

const bound = Meteor.bindEnvironment((callback) => {
  callback();
});

export default bound;
