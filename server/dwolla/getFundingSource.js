import Dwolla from './dwolla';

export default async function getFundingSource(url) {

  const result = await Dwolla()
    .get(url)
    .then((res) => res.body);

  const { type, status, bankAccountType, bankName, name, created, channels } = result;

  return {
    type,
    status,
    bankAccountType,
    bankName,
    name,
    created,
    channels
  };
}
