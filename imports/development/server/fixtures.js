import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles';
import { Meteor } from 'meteor/meteor';
import { Settings } from '../../../server/collections/settings';

const roles = ['admin', 'support', 'super-admin', 'technical', 'financial'];

const firstUser = {
  email: 'admin@ualett.com',
  password: 'admin1234',
  isAdmin: true,
  firstName: 'Super',
  lastName: 'Admin'
};

export default async function fixtures() {
  roles.forEach((role) => {
    Roles.createRole(role, { unlessExists: true });
  });

  if (
    !Meteor.users.findOne({
      'emails.address': firstUser.email
    })
  ) {
    const id = Accounts.createUser(firstUser);

    if (id) {
      Roles.addUsersToRoles(id, ['admin', 'super-admin'], Roles.GLOBAL_GROUP);
      console.log(`${firstUser.email} created!`);
    }
  }
  //
  if (
    !Settings.findOne({
      _id: 'productsByCategories'
    })
  ) {
    Settings.insert({
      _id: 'productsByCategories',
      products: [
        {
          category: 'a',
          products: [
            {
              amount: 550,
              options: [
                {
                  name: '6 Weeks',
                  numberOfPayments: 6,
                  termsOfPayment: 'weekly',
                  fees: [0.22, 0.2, 0.18]
                },
                {
                  name: '8 Weeks',
                  numberOfPayments: 8,
                  termsOfPayment: 'weekly',
                  fees: [0.24, 0.22, 0.2]
                },
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0.26, 0.24, 0.22]
                }
              ]
            },
            {
              amount: 700,
              options: [
                {
                  name: '6 Weeks',
                  numberOfPayments: 6,
                  termsOfPayment: 'weekly',
                  fees: [0.22, 0.2, 0.18]
                },
                {
                  name: '8 Weeks',
                  numberOfPayments: 8,
                  termsOfPayment: 'weekly',
                  fees: [0.24, 0.22, 0.2]
                },
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0.26, 0.24, 0.22]
                }
              ]
            },
            {
              amount: 1000,
              options: [
                {
                  name: '6 Weeks',
                  numberOfPayments: 6,
                  termsOfPayment: 'weekly',
                  fees: [0.22, 0.2, 0.18]
                },
                {
                  name: '8 Weeks',
                  numberOfPayments: 8,
                  termsOfPayment: 'weekly',
                  fees: [0.24, 0.22, 0.2]
                },
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0.26, 0.24, 0.22]
                }
              ]
            }
          ]
        },
        {
          category: 'b',
          products: [
            {
              amount: 550,
              options: [
                {
                  name: '6 Weeks',
                  numberOfPayments: 6,
                  termsOfPayment: 'weekly',
                  fees: [0.22, 0.2, 0.18]
                },
                {
                  name: '8 Weeks',
                  numberOfPayments: 8,
                  termsOfPayment: 'weekly',
                  fees: [0.24, 0.22, 0.2]
                },
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0.26, 0.24, 0.22]
                }
              ]
            },
            {
              amount: 700,
              options: [
                {
                  name: '6 Weeks',
                  numberOfPayments: 6,
                  termsOfPayment: 'weekly',
                  fees: [0.22, 0.2, 0.18]
                },
                {
                  name: '8 Weeks',
                  numberOfPayments: 8,
                  termsOfPayment: 'weekly',
                  fees: [0.24, 0.22, 0.2]
                },
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0.26, 0.24, 0.22]
                }
              ]
            }
          ]
        },
        {
          category: 'c',
          products: [
            {
              amount: 550,
              options: [
                {
                  name: '8 Weeks',
                  numberOfPayments: 8,
                  termsOfPayment: 'weekly',
                  fees: [0.24, 0.22, 0.2]
                },
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0.26, 0.24, 0.22]
                }
              ]
            }
          ]
        },
        {
          category: 'none',
          products: [
            {
              amount: 0,
              options: [
                {
                  name: '10 Weeks',
                  numberOfPayments: 10,
                  termsOfPayment: 'weekly',
                  fees: [0]
                }
              ]
            }
          ]
        }
      ]
    });
  }
}
