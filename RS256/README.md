# Calling A External IDP API Eg. Google using webtask

Sample project for creating an Express-based server that runs on webtask.io for accessing external IDP api with the user's idp access token.
### Version
0.0.1
# Initial Setup & Configuration
```bash
# Create a new wt-cli profile
npm install -g wt-cli
wt init

# Or, if you already use wt-cli:
wt profile ls
```

### Setup

Change the following values in webtask.js

```sh
const JWKS_URI = 'https://{tenant}.auth0.com/.well-known/jwks.json';
const AUDIENCE = '{CLIENT_ID}';
const ISSUER = 'https://{tenant}.auth0.com/';

```

### Initialization
```sh
$ wt create ext_idp_webtask.js --name ext_idp
    -s CLIENT_ID=YOUR_NON_INTERACTIVE_AUTH0_CLIENT_ID
    -s CLIENT_SECRET=YOUR_NON_INTERACTIVE_AUTHO_CLIENT_SECRET
    -s ACCOUNT_NAME=YOUR_AUTH0_TENANT_NAME
```
The above command would create a webtask and give you a url like this
```
Webtask created

You can access your webtask at the following url:

https://vjayaram.au.webtask.io/ext_idp
```
# Usage
```sh
  "use strict";
  const request = require('request');
  const options = {
    url: 'URL_WHEN_YOU_CREATE_WEBTASK',
    headers: {Authorization: 'Bearer USER_ID_TOKEN'},
    json: {api_url: 'https://www.googleapis.com/youtube/v3/channels?part=snippet%2C+id%2C+statistics&mine=true'}
  };
  request.post(options, function (e, r, b){});
```
