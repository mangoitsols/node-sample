import express from 'express';
import responseFormat from './response-format';


let app = express.Router();

app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let contentType = req.headers["content-type"]
    if (contentType && contentType === "application/json") {
      let body = req.body;
      if (body) {
        if (typeof (body) !== "object") {
          let response = responseFormat.createResponseTemplate();
          response = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
          res.status(400).json(response);
          return;
        }
      }
    } else {
      let response = responseFormat.createResponseTemplate();
      response = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
      res.status(400).json(response);
      return;
    }
  }
  next();
});

module.exports=app;