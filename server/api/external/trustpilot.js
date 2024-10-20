import cors from 'cors';
import { API } from '../api';
import axios from 'axios';
import { Settings } from '../../collections/settings';
import { TRUSTPILOT_API_KEY, TRUSTPILOT_SECRET } from '../../keys';
import express from 'express';

const corsOptions = {
  allowedHeaders: ['token', 'daterange', 'startdate', 'enddate']
};

API.post('/trustpilot/invite', cors(corsOptions), express.json(), async (req, res) => {
  const { consumerEmail, consumerName, referenceNumber } = req.body;
  const token = await Buffer.from(`${TRUSTPILOT_API_KEY}:${TRUSTPILOT_SECRET}`).toString('base64');
  const trustPilotAccessToken = await Settings.findOne({ _id: 'trustpilotToken' });
  let savedToken = trustPilotAccessToken?.value?.accessToken || '';

  const updateAccessToken = async () => {
    const {
      data: { access_token: accessToken, refresh_token: refreshToken }
    } = await axios.post(
      'https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken',
      new URLSearchParams({
        grant_type: 'password',
        username: 'jeremy.polanco@ualett.com',
        password: 'Yosoyalto15.'
      }),
      {
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    Settings.update(
      { _id: 'trustpilotToken' },
      {
        $set: {
          value: {
            refreshToken,
            accessToken
          }
        }
      }
    );

    return accessToken;
  };

  const sendEmailInvitation = async (token) => {
    return await axios.post(
      'https://invitations-api.trustpilot.com/v1/private/business-units/6304e2b391601441fb8098dd/email-invitations',
      {
        replyTo: 'Support@ualett.com',
        locale: 'en-US',
        senderName: 'Ualett',
        senderEmail: 'noreply.invitations@trustpilot.com',
        referenceNumber,
        consumerName,
        consumerEmail,
        type: 'email',
        serviceReviewInvitation: {
          templateId: '5c51a973e1ebcd0001c27fbd',
          redirectUri: 'https://www.trustpilot.com'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token || savedToken}`
        }
      }
    );
  };

  try {
    if (!consumerEmail || !referenceNumber || !consumerName) {
      return res.status(400).json({
        message: 'missing data.'
      });
    }

    if (!trustPilotAccessToken?.value?.accessToken) {
      savedToken = await updateAccessToken();
    }

    await sendEmailInvitation();

    return res.status(200).json({
      status: 'success'
    });
  } catch (error) {
    if (error.response.status === 401) {
      savedToken = await updateAccessToken();

      await sendEmailInvitation(savedToken);
    }

    return res.status(200).json({
      status: 'success'
    });
  }
});
