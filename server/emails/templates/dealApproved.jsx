import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import format from 'date-fns/format';
import footer from './components/footer.jsx';
import { Title, P } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default (user, deal) => (
  <Email title="Cash Advance Approved" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
    <Item align="center" style={{ padding: 10 }} />

    <Item align="center">
      <Box
        cellSpacing={20}
        width="100%"
        style={{
          backgroundColor: '#fff',
          padding: 10,
          border: '1px solid #e5e5e5'
        }}
      >
        <Item align="center" style={{ paddingTop: 10, paddingBottom: 20 }}>
          <Image alt="ualett" src="https://ualett.com/static/img/blue-logo.png" height={40} width={120} />
        </Item>

        <Item style={{ paddingTop: 10, paddingBottom: 20 }}>
          <Title>Congratulations, your cash advance was approved.</Title>
        </Item>

        <Item>
          <P style={{ fontSize: 17 }}>
            Your approved funds have been initiated to your added bank account. More information below.
          </P>
        </Item>

        <Item style={{ fontSize: 16, paddingTop: 20, borderTop: '1px solid #eee' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td>
                  <P style={{ fontWeight: 'bold' }}>Type</P>
                </td>
                <td>
                  <P>Bank Transfer</P>
                </td>
              </tr>

              <tr>
                <td>
                  <P style={{ fontWeight: 'bold' }}>Account</P>
                </td>
                <td>
                  <P>
                    {user.bankAccount.bankName} {user.bankAccount.name} XXX{user.bankAccount.mask}
                  </P>
                </td>
              </tr>

              <tr>
                <td>
                  <P style={{ fontWeight: 'bold' }}>Amount</P>
                </td>
                <td>
                  <P>${Number(deal.amount).toFixed(2)}</P>
                </td>
              </tr>

              <tr>
                <td>
                  <P style={{ fontWeight: 'bold' }}>Date</P>
                </td>
                <td>
                  <P>{format(deal.approvedAt, 'MMMM dd, y')}</P>
                </td>
              </tr>
            </tbody>
          </table>
        </Item>

        <Item style={{ paddingTop: 10 }}>
          <P style={{ fontSize: 16 }}>The payment may take 3-4 business days to process.</P>
          <P style={{ fontSize: 16 }}>You can follow the status of your cash advance in the Ualett App</P>
        </Item>

        <Item style={{ paddingTop: 20 }}>
          <P style={{ fontSize: 16 }}>
            You’ve agreed that future payments to Ualett will be processed by the Dwolla payment system using the added
            bank account above.
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);
