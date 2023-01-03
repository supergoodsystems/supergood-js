const getKeyValueByString = (object, initialPath) => {
  let path = initialPath.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  path = path.replace(/^\./, ''); // strip a leading dot
  const finalPath = path.split('.');
  let key;
  for (let i = 0, n = finalPath.length; i < n; ++i) {
    key = finalPath[i];
    if (key in object) {
      object = object[key];
    } else {
      return;
    }
  }
  return { key, value: object };
};

const getOptions = (clientId, clientSecret) => {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        clientId + ':' + clientSecret
      ).toString('base64')}`
    }
  };
};

module.exports = {
  getKeyValueByString,
  getOptions
};
