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

  server.use(router);
  return server.listen(HTTP_OUTBOUND_TEST_SERVER_PORT, () => {
    console.log(`JSON Server is running on ${HTTP_OUTBOUND_TEST_SERVER_PORT}`);
  });
};

export { initialize };
