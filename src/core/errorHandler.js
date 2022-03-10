import express from 'express';
import responseFormat from './response-format';


let app = express.Router();

app.use(function (err, req, res, next) { 
  let response = responseFormat.createResponseTemplate();
  if (err && err.status) {
    if (err.status == 401) {
      logger.error('Error has occured in servr.js  // error handler section .', err);
      response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
      res.status(401).json(response);
    }
    if (err.status == 404) {
      logger.error('Error has occured in servr.js  // error handler section .', err);
      response = responseFormat.getResponseMessageByCodes(['common404'], { code: 404 });
      res.status(404).json(response);
    }
    if (err.status == 500) {
      logger.error('Error has occured in servr.js  // error handler section .', err);
      response = responseFormat.getResponseMessageByCodes(['common500'], { code: 500 });
      res.status(500).json(response);
    }
  }
  else {

    logger.error('Error has occured in servr.js .', err);
    response = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
    res.status(400).json(response);
  }
});

module.exports=app;