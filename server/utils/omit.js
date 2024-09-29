export default function omit(obj, ...props) {
  const result = { ...obj };
  props.forEach((prop) => {
    delete result[prop];
  });
  return result;
}
