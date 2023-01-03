const axios = require('axios');

const getConfig = async (baseUrl, options) =>
  axios.get(`${baseUrl}/api/config`, options);

const postEvents = async (baseUrl, data, options) =>
  axios.post(`${baseUrl}/api/events`, data, options);

const dumpDataToDisk = (data) => {
  console.log(data);
};

module.exports = {
  getConfig,
  postEvents,
  dumpDataToDisk
};
