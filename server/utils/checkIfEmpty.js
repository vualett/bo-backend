const checkIfEmpty = (fields) => {
  if (Object.entries(fields).length === 0 && fields.constructor === Object) throw new Meteor.Error('OBJECT_EMPTY');
};

export default checkIfEmpty;
