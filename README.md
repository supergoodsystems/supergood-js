# This library is deprecated! 

We started off as an observability product for third-party APIs, and realized that rather than simply pointing out problems with APIs, we need to fix them. As such, we're sunsetting our pure observability product and using it internally for the new "unofficial" APIs we now generate.

Reach out to alex@supergood.ai if you'd like to learn more, or check us out at https://supergood.ai

---
description: The Node.js client is written in Typescript and is non-blocking.
---

# Node.js

The Supergood Node.js client connects Supergood to your Node.js application. Follow these steps to integrate with the Node.js client.

## 1. Install the Supergood library

```bash
# with yarn
yarn add supergood@latest
```

```bash
# with npm
npm install supergood@latest
```

## 2. Initialize the Supergood library

**Environment variables**

Set the environment variables `SUPERGOOD_CLIENT_ID` and `SUPERGOOD_CLIENT_SECRET` using the API keys generated in the [getting started instructions](../../getting-started.md).

Initialize the Supergood client at the root of your application, or anywhere you're making API calls with the following code:

```typescript
// with ES Modules
import Supergood from 'supergood'

Supergood.init()
```

```typescript
// with CommonJS
const Supergood = require('supergood')

Supergood.init()
```

**Passing keys**

You can also pass the API keys in manually without setting environment variables.\
\
Replace `<CLIENT_ID>` and `<CLIENT_SECRET>` with the API keys you generated in the [getting started instructions](../../getting-started.md).

```typescript
// with ES Modules
import Supergood from 'supergood'

Supergood.init({ clientId: <CLIENT_ID>, clientSecret: <CLIENT_SECRET> })
```

```typescript
// with CommonJS
const Supergood = require('supergood')

Supergood.init({ clientId: <CLIENT_ID>, clientSecret: <CLIENT_SECRET> })
```

## 3. Monitor your API calls

You're all set to use Supergood!

Head back to your [dashboard](https://dashboard.supergood.ai) to start monitoring your API calls and receiving reports.

## Links

* [Supergood npm package](https://www.npmjs.com/package/supergood)
* [Supergood-js Source Code](https://github.com/supergoodsystems/supergood-js)
* [Supergood Docs](https://docs.supergood.ai)
