import Dwolla from './dwolla';

export default async function getTransfer(url) {
  return Dwolla()
    .get(url)
    .then((res) => res.body);
}
