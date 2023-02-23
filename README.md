# supergood-js

npm: https://www.npmjs.com/package/supergood

# Spec

- Supergood is a lightweight client that captures all outbound HTTP traffic and ships it to server and database for classification and analysis.
- The Supergood client must be easy to install with a few lines of code and a configuration file, rather than decorating entire codebases.

# To Install
`npm install supergood` or `yarn add supergood`

# To Use

```
import Supergood from 'supergood'
Supergood.init()

```

or

```
const Supergood = require('supergood')
Supergood.init()
```

# Environment Variables to set or pass

```
SUPERGOOD_CLIENT_ID=<taken from supergood dashboard>
SUPERGOOD_CLIENT_SECRET=<taken from supergood dashboard>
SUPERGOOD_BASE_URL=<url for local development, staging, prod. Defaults to prod>
SUPERGOOD_LOG_LEVEL=<set to 'debug' for debug messages>
```
