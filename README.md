# Python

The Supergood Python client connects Supergood to your Python application. Follow these steps to integrate with the Python client.

## 1. Install the Supergood library

```bash
pip install supergood
```

## 2. Initialize the Supergood Library

**Environment variables**

Set the environment variables `SUPERGOOD_CLIENT_ID` and `SUPERGOOD_CLIENT_SECRET` using the API keys generated in the [getting started instructions](../getting-started.md).

Initialize the Supergood client at the root of your application, or anywhere you're making API calls with the following code:

```python
from Supergood import Client

Client()
```

**Passing keys**

You can also pass the API keys in manually without setting environment variables.\
\
Replace `<CLIENT_ID>` and `<CLIENT_SECRET>` with the API keys you generated in the [getting started instructions](../getting-started.md).

```python
from Supergood import Client

Client(client_id="<CLIENT_ID>", client_secret="<CLIENT_SECRET>")
```

## 3. Monitor your API calls

You're all set to use Supergood!

Head back to your [dashboard](https://dashboard.supergood.ai) to start monitoring your API calls and receiving reports.

## Links

* [Supergood PyPi Project](https://pypi.org/project/supergood/)
* [Supergood\_py Source Code](https://github.com/supergoodsystems/supergood-py)
