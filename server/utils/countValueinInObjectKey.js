const countValueinInObjectKey = (obj) => {
  const toReturn = {};

  Object.entries(obj).forEach(([k, v]) => {
    toReturn[k] = v.length;
    return true;
  });

  return toReturn;
};

export default countValueinInObjectKey;
