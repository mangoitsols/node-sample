import express from 'express';
import responseFormat from './response-format';
import routesConfig from './routes';


let app = express.Router();

app.use((req, res, next) => { 
  let response = responseFormat.createResponseTemplate();
  const exists = routesConfig.routeExists(req.originalUrl,req.method);
  if (!exists) {
    //console.log('handle404',exists)
    response = responseFormat.getResponseMessageByCodes(['common404'], { code: 404 });
    res.status(404).json(response);
    return;
  }
  next();
});

module.exports=app;