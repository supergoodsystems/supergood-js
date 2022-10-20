const axios = require('axios');
// const fs = require('fs');

const { SUPERGOOD_SERVER_URL } = require('../config');

const getConfig = async () => {
  console.log('config');
  const endpoint = `${SUPERGOOD_SERVER_URL}/api/config`;
  const { data } = await axios.get(endpoint);
  return data;
};

const getAccessToken = async ({ tokenExchangeUrl, clientId, clientSecret }) => {
  console.log('access token');
  try {
    const { data } = await axios.request({
      url: tokenExchangeUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: clientId,
        password: clientSecret
      },
      data: {
        grant_type: 'client_credentials',
        scope: 'log_events'
      }
    });
    return data.access_token;
  } catch (e) {
    console.log(e);
    return null;
  }
};

const postEvents = async ({ eventPathUrl, accessToken, data }) =>
  axios.request({
    url: eventPathUrl,
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    data
  });

// TODO, FIX EXIT STRATEGY
const dumpDataToDisk = (/* data */) => {
  // const today = new Date().toLocaleString().replace(/\/g/, '-');
  // console.log({ today, data });
  // fs.writeFileSync(`cached-requests-${today}.txt`, JSON.stringify(data), {
  //   flag: 'a'
  // });
};

module.exports = { getConfig, getAccessToken, postEvents, dumpDataToDisk };
