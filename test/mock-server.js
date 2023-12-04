const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const jsonServer = require('json-server');

const initialDB = require('./mock-db');

const PORT = process.env.MOCK_SERVER_PORT || 3001;

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const setupMockServer = async () => {
  resetDatabase();

  const server = jsonServer.create();
  const router = jsonServer.router(path.join(__dirname, 'db.json'));
  const middlewares = jsonServer.defaults();

  const httSuccessCodes = [200];
  const httpErrorCodes = [400, 401, 403, 404, 500, 501, 502, 503, 504];

  server.use(middlewares);

  const httpCodes = [...httSuccessCodes, ...httpErrorCodes];

  for (let i = 0; i < httpCodes.length; i++) {
    server.get(`/${httpCodes[i]}`, async (req, res) => {
      if (req.query.sleep) {
        const sleepString = req.query.sleep;
        const sleepArg = sleepString ? parseInt(sleepString, 10) : 0;
        await sleep(sleepArg);
      }
      res.status(httpCodes[i]).jsonp(req.query);
    });
  }

  server.get('/massive-response', async (req, res) => {
    const payloadSize = parseInt(req.query.payloadSize, 10) || 1;
    res.status(200).jsonp({ massiveResponse: 'X'.repeat(payloadSize) });
  });

  server.get('/gzipped-response', async (_, res) => {
    res.set('Content-Encoding', 'gzip');
    const payload = zlib.gzipSync(
      JSON.stringify({ gzippedResponse: 'this-is-gzipped' })
    );
    res.status(200).send(payload);
  });

  server.get('/custom-header', async (_, res) => {
    res.set('X-Custom-Header', 'custom-header-value');
    res.status(200).jsonp({ success: 'ok' });
  });

  server.use(router);

  mockServer = server.listen(PORT, () =>
    console.log(`Mock Server is running on ${PORT}`)
  );
};

const resetDatabase = () => {
  fs.writeFileSync(
    path.join(__dirname, 'db.json'),
    JSON.stringify(initialDB, null, 2),
    {
      encoding: 'utf8',
      flag: 'w'
    }
  );
};

setupMockServer();
