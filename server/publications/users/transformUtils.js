export function capitalizeFullName({ firstName, lastName }) {
  function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const full = `${capitalize(firstName)} ${capitalize(lastName)}`;

  return full;
}

export function overallRating({ rating }) {
  if (!rating || rating.length < 2) return 0;

  const ratingArray = rating.map((r) => r.rating);
  const reduced = ratingArray.reduce((a, b) => a + b, 0);
  const avg = reduced / ratingArray.length;

  return Math.floor(avg);
}

const utils = {
  capitalizeFullName,
  overallRating
};
export default utils;
