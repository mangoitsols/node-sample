import express from 'express';
import responseFormat from './response-format';
import CommonMethods from './common-methods';
import logger from './logger';

let app = express.Router();

app.use((req, res, next) => {
  console.log('-----in------------')
  let response = responseFormat.createResponseTemplate(),
    commonMethods = new CommonMethods();
    commonMethods.isDbConnected()
      .then((isconnected) => {
        if (isconnected == 0) {
          response = responseFormat.getResponseMessageByCodes(['common500'], { code: 500 });
          res.status(500).json(response);
          return;
        }
      })
      .catch((error) => {
        logger.error('Error has occured in servr.js  // isDbConnected section .', error);
        response = responseFormat.getResponseMessageByCodes(['common500'], { code: 500 });
        res.status(500).json(response);
        return;
      })
  next();
});

module.exports=app;