export default (doc) => {
  const newDoc = doc;

  newDoc.emailVerified = doc.emails[doc.emails.length - 1].verified;

  function complete() {
    return doc.hasFunding && doc.hasDriverLicense && newDoc.emailVerified;
  }

  newDoc.complete = complete();

  newDoc.suspended = false;
  return newDoc;
};
