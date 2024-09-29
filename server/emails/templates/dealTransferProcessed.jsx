import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import moment from 'moment';
import { Title, P, Link, Span } from './components/emailComponets.jsx';

import footer from './components/footer.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

const DealTransferProcessed = (user, deal, set) => (
  <Email title="Cash advance transfer processed" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
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
          <Image alt="ualett" src="https://app.ualett.com/static/img/blue-logo.png" height={40} width={120} />
        </Item>

        <Item style={{ paddingBottom: 10 }}>
          <Title>
            Hi <Span style={{ fontWeight: 500 }}>{user.firstName}</Span>, your cash advance transfer has been processed.
          </Title>
        </Item>

        <Item>
          <P style={{ fontSize: 16 }}>Here is your recurring payments schedule:</P>
        </Item>

        <Item style={{ paddingLeft: 20 }}>
          <Box>
            {set.payments.map((p) => (
              <Item style={{ fontSize: 16 }} key={p.date}>
                <P>
                  <Span style={{ fontWeight: 'bold' }}> ${Number(p.amount).toFixed(2)}</Span> on{' '}
                  {moment(p.date).format('MMM Do, YYYY')}
                </P>
              </Item>
            ))}
          </Box>
        </Item>

        <Item style={{ paddingBottom: 10 }}>
          <P style={{ fontSize: 16 }}>
            You’ve agreed that future payments to Ualett will be processed by the Dwolla payment system using the added
            bank account above.
          </P>
        </Item>

        <Item style={{ paddingBottom: 10 }}>
          <P style={{ fontSize: 18 }}>Questions? Contact us at:</P>
          <P
            style={{
              fontWeight: 500,
              color: '#0057b7',
              fontSize: 18
            }}
          >
            <Link href="mailto:support@ualett.com">support@ualett.com</Link>
          </P>
        </Item>

        <Item>
          <P style={{ marginTop: 10, fontSize: 14 }}>
            We will initiate the recurring payments set on the dates above from your bank account added. Make sure you
            have enough balance and avoid fee charges for insufficient funds.
          </P>
          <P style={{ marginTop: 10, fontSize: 14 }}>
            You can at any time, make changes contacting us, shall you decide to pay the total balance and cancel this
            recurring payment series.
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);

export default DealTransferProcessed;
