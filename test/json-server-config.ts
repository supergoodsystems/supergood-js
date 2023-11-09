import zlib from 'zlib';
import jsonServer from 'json-server';
import http from 'http';
import path from 'path';

const HTTP_OUTBOUND_TEST_SERVER_PORT =
  process.env.HTTP_OUTBOUND_TEST_SERVER_PORT || 3001;

const initialize = async (): Promise<http.Server> => {
  const server = jsonServer.create();
  const router = jsonServer.router(path.join(__dirname, 'db.json'));
  const middlewares = jsonServer.defaults();

  const httSuccessCodes = [200];
  const httpErrorCodes = [400, 401, 403, 404, 500, 501, 502, 503, 504];

  server.use(middlewares);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const httpCodes = [...httSuccessCodes, ...httpErrorCodes];

  for (let i = 0; i < httpCodes.length; i++) {
    server.get(`/${httpCodes[i]}`, async (req, res) => {
      if (req.query.sleep) {
        const sleepString = req.query.sleep as string;
        const sleepArg = sleepString ? parseInt(sleepString, 10) : 0;
        await sleep(sleepArg);
      }
      res.status(httpCodes[i]).jsonp(req.query);
    });
  }

  server.get('/massive-response', async (req, res) => {
    const payloadSize = parseInt(req.query.payloadSize as string, 10) || 1;
    res.status(200).jsonp({ massiveResponse: 'X'.repeat(payloadSize) });
  });

  server.get('/gzipped-response', async (req, res) => {
    res.set('Content-Encoding', 'gzip');
    const payload = zlib.gzipSync(
      JSON.stringify({ gzippedResponse: 'this-is-gzipped' })
    );
    res.status(200).send(payload);
  });

  server.get('/custom-header', async (req, res) => {
    res.set('X-Custom-Header', 'custom-header-value');
    res.status(200).jsonp({ success: 'ok' });
  });

  server.use(router);
  return server.listen(HTTP_OUTBOUND_TEST_SERVER_PORT, () => {
    console.log(`JSON Server is running on ${HTTP_OUTBOUND_TEST_SERVER_PORT}`);
  });
};

export { initialize };
