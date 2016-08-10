"use strict";

 const jwt     = require('jsonwebtoken');
 const moment  = require('moment');
 const request = require('request');
 const express = require('express');
 const Webtask = require('webtask-tools');
 const async   = require('async');
 const app     = express();

 /*
 * Local variables
 */
 let accessToken = null;
 let lastLogin = null;

 app.post('/call_ext_api', function (req, res) {
   if (!req.headers['authorization']){ return res.status(401).json({ error: 'unauthorized'}); }
   const context = req.webtaskContext;
   const token = req.headers['authorization'].split(' ')[1];
   const reqBody = req.webtaskContext.body;
   if (!reqBody) {
     return res.status(400).json({error: 'api_url is required'});
   }
   async.waterfall([
     async.apply(verifyJWT, context, reqBody, token),
     getAccessToken,
     getUserProfile,
     callExtIDPApi
   ], function (err, result) {
     if (err) return res.status(400).json({error: err});
     return res.status(200).json({data: result});
   });
 });
/*
* Verify that the user id_token is signed by the correct Auth0 client
*/
function verifyJWT(context, reqBody, token, cb) {
   return jwt.verify(token, new Buffer(context.data.ID_TOKEN_CLIENT_SECRET, 'base64'), function(err, decoded) {
     if (err) return cb(err);
     cb(null, context, reqBody, decoded);
   });
};
/*
* Request a Auth0 access token every 30 minutes
*/
function getAccessToken(context, reqBody, decoded, cb) {
   if (!accessToken || !lastLogin || moment(new Date()).diff(lastLogin, 'minutes') > 30) {
     const options = {
       url: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/oauth/token',
       json: {
         audience: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/api/v2/',
         grant_type: 'client_credentials',
         client_id: context.data.CLIENT_ID,
         client_secret: context.data.CLIENT_SECRET
       }
     };

     return request.post(options, function(err, response, body){
       if (err) return cb(err);
       else {
         lastLogin = moment();
         accessToken = body.access_token;
         return cb(null, context, reqBody, decoded, accessToken);
       }
     });
   } else {
     return cb(null, context, reqBody, decoded, accessToken);
   }
 };

/*
* Get the complete user profile with the read:user_idp_token scope
*/
function getUserProfile(context, reqBody, decoded, token, cb){
   const options = {
     url: 'https://' + context.data.ACCOUNT_NAME + '.auth0.com/api/v2/users/' + decoded.sub,
     json: true,
     headers: {
       authorization: 'Bearer ' + token
     }
   };

  request.get(options, function(error, response, user){
     return cb(error, context, reqBody, user);
   });
 };

/*
* Call the External API with the IDP access token to return data back to the client.
*/
function callExtIDPApi (context, reqBody, user, cb) {
  let idp_access_token = null;
  const api = reqBody.api_url;
  const provider = user.user_id.split('|')[0];
  /*
  * Checks for the identities array in the user profile
  * Matches the access_token with the user_id provider/strategy
  */
  if (user && user.identities) {
    for (var i = 0; i < user.identities.length; i++) {
      if (user.identities[i].access_token && user.identities[i].provider === provider) {
        idp_access_token = user.identities[i].access_token;
        i = user.identities.length;
      }
    }
  }
  if (idp_access_token) {
    var options = {
      method: 'GET',
      url: api,
      headers: {Authorization: 'Bearer ' + idp_access_token}
    };
    request(options, function (error, response, body) {
      if (error) cb(error);
      cb(null, JSON.parse(body));
    });
  } else {
    cb({error: 'No Access Token Available'});
  }
};

module.exports = Webtask.fromExpress(app);
