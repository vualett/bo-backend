import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import moment from 'moment';
import footer from './components/footer.jsx';
import { Title, P, Link } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

const FundingSourceAdded = (user, bankAccount) => (
  <Email title="Funding Added" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
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

        <Item>
          <Title>You have successfully add your Bank Account on {moment().format('MMMM Do, YYYY')}</Title>
        </Item>

        <Item style={{ paddingTop: 20 }}>
          <P style={{ fontSize: 16 }}>{bankAccount.bankName}</P>
          <P style={{ fontSize: 16 }}>
            {bankAccount.name} XXX{bankAccount.mask}
          </P>
        </Item>

        <Item style={{ paddingTop: 20 }}>
          <P style={{ fontSize: 16 }}>
            You’ve agreed that future payments to Ualett will be processed by the Dwolla payment system using the added
            bank account above.
          </P>
        </Item>

        <Item style={{ paddingTop: 40 }}>
          <P style={{ fontSize: 16 }}>You can remove or change your bank account by contacting us.</P>
          <P
            style={{
              fontWeight: 500,
              color: '#0057b7',
              fontSize: 17
            }}
          >
            <Link href="mailto:support@ualett.com">support@ualett.com</Link>
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);

export default FundingSourceAdded;
