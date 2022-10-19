const axios = require('axios');
const fs = require('fs');

const { SERVER_URL } = require('../config');

const getConfig = async () => {
  const endpoint = `${SERVER_URL}/api/config`;
  const { data } = await axios.get(endpoint);
  return data;
};

const getAccessToken = async ({ tokenExchangeUrl, clientId, clientSecret }) => {
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

const flushCache = async ({ cache, eventPathUrl, accessToken }) => {
  try {
    const response = await axios.request({
      url: eventPathUrl,
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      data: cache
    });
    if (!response || response.statusCode !== 200) {
      dumpCacheToDisk(cache);
      return false;
    }
    return true;
  } catch (e) {
    dumpCacheToDisk(cache);
    return false;
  }
};

const dumpCacheToDisk = (cache) => {
  fs.writeFileSync(`cached-requests-${new Date()}`, JSON.stringify(cache));
};

module.exports = { getConfig, getAccessToken, flushCache };
