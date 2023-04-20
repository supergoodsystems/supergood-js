---
description: The Node.js client is written in Typescript and is non-blocking.
---

# Node.js

The Supergood Node.js client connects Supergood to your Node.js application.
Follow these steps to integrate with the Node.js client.

## 1. Install the Supergood library

{% code title="Yarn" %}
```bash
yarn add supergood@latest
```
{% endcode %}

{% code title="npm" %}
```bash
npm install supergood@latest
```
{% endcode %}

## 2. Initialize the Supergood library

**Environment variables**

Set the environment variables `SUPERGOOD_CLIENT_ID` and `SUPERGOOD_CLIENT_SECRET` using the API keys generated in the [getting started instructions](../getting-started.md).

Initialize the Supergood client at the root of your application, or anywhere you're making API calls with the following code:

{% code title="ES Modules" %}
```typescript
import Supergood from 'supergood'

Supergood.init()
```
{% endcode %}

{% code title="CommonJS" %}
```typescript
const Supergood = require('supergood')

Supergood.init()
```
{% endcode %}

**Passing keys**

You can also pass the API keys in manually without setting environment variables.\
\
Replace `<CLIENT_ID>` and `<CLIENT_SECRET>` with the API keys you generated in the [getting started instructions](../getting-started.md).

{% code title="ES Modules" %}
```typescript
import Supergood from 'supergood'

Supergood.init({ clientId: <CLIENT_ID>, clientSecret: <CLIENT_SECRET> })
```
{% endcode %}

{% code title="CommonJS" %}
```typescript
const Supergood = require('supergood')

Supergood.init({ clientId: <CLIENT_ID>, clientSecret: <CLIENT_SECRET> })
```
{% endcode %}

## 3. Monitor your API calls

You're all set to use Supergood!

Head back to your [dashboard](https://dashboard.supergood.ai) to start monitoring your API calls and receiving reports.

## Links

* [Supergood npm package](https://www.npmjs.com/package/supergood)
* [Supergood-js Source Code](https://github.com/supergoodsystems/supergood-js)
