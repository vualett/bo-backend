import faker from 'faker';
import { Random } from 'meteor/random';

export default () => ({
  email: faker.internet.email(),
  firstName: faker.name.firstName(),
  lastName: faker.name.lastName(),
  password: '00000000',
  type: 'user',
  address: {
    street1: faker.address.streetAddress(),
    city: faker.address.city(),
    state: faker.address.stateAbbr(),
    postal_code: faker.address.zipCode()
  },
  business: {
    industry: Random.choice(['Independent Contractor Driver', 'Independent Contractor']),
    business_name: Random.choice(['Uber', 'Lyft', 'Instacart', 'doordarsh', 'Grubhub', 'Postmates', 'Amazon Flex'])
  },
  phone: faker.phone.phoneNumberFormat(2).replace(/-/g, ''),
  metadata: { platform: { OS: Random.choice(['IOS', 'Android']), Version: '1.1' } }
});