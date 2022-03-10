/**
 * -------Import all classes and packages -------------
 */
import express from 'express';
import configContainer from './config/localhost';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressJwt from 'express-jwt';
import unless from 'express-unless';
import responseFormat from './core/response-format';
import jwt from 'jsonwebtoken';
import logger from './core/logger';
import redis from './core/redis-client';
import CommonMethods from './core/common-methods';
import path from 'path';
import getRawBody from 'raw-body';
import cors from 'cors';
import loggerInfo from './core/logger-info';
import authMiddleware from './core/authenticationMiddleware';
import handle404 from './core/handle404';
import errorHandler from './core/errorHandler';
import handleRequestFormat from './core/handleRequestFormat';
import dbConnectionMiddleware from './core/dbConnectionMiddleware';
import customCors from './core/customCors';



/**
 *  -------Initialize global variables-------------
 */
let app = express();

app.use(cors());

/**
 * file upload limit extend body limit
 */
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

/*
*   handle json syntax error in request 
*/
app.use(function(err, req, res, next) 
{
  if(err)
  {
    logger.error('Error has occured in servr.js  // json Error  .', err);
    let response = responseFormat.createResponseTemplate();
    response = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
    res.status(400).json(response);
  }
  else
  {
    next();
  }
});


/**
 * File access by local url
 */
let staticPath1 = path.join(__dirname, '..');
app.use("/Documents", express.static(staticPath1 + '/Documents'));
app.use("/log", express.static(staticPath1 + '/log'));
app.use("/info", express.static(staticPath1 + '/info'));
app.use("/Upload", express.static(staticPath1 + '/Upload')); 

/**
 * File access by server url
 */
let staticPath = path.join(__dirname);
app.use("/Documents", express.static(staticPath + '/Documents'));
app.use("/log", express.static(staticPath + '/log')); 
app.use("/info", express.static(staticPath + '/info')); 
app.use("/Upload", express.static(staticPath + '/Upload'));

/**
 *  Handle CORS request  
 */
app.use(customCors);



/**
 * check database is connected
 */
app.use(dbConnectionMiddleware);

let config = configContainer.loadConfig();


/**
 *  Handle Authorization and  Authentication permission 
 */
app.use(authMiddleware) ;


/**
 *  Handle Request is on proper format  
 */
app.use(handleRequestFormat);


let api_versions = config.api_versions;
app.use(function(req, res, next)
{

	// -- If Version is not provided in api call it will be treated as v1  
	let allVers = Object.keys(api_versions).map( i => {return api_versions[i].path.substr(1)})
  
	if(allVers.indexOf(req.originalUrl.split('/')[1]) < 0 )
	{
		req.originalUrl = '/'+allVers[0]+req.originalUrl;
	}

	
	for(let j=0; j<Object.keys(api_versions).length; j++)
	{ 
		let x = Object.keys(api_versions)[j];
		let ky = '/'+req.originalUrl.split('/')[1]+'/'+req.originalUrl.split('/')[2];
		
		if(api_versions[ky].inUse == false)
		{
      let arr = req.originalUrl.split('/');
      let ress = {
          "success": true,
          "code": 200,
          "message": "Processed",
          "description": "OK",
          "content": {
              "dataList": [],
              "messageList": {},
              "mandatory": !api_versions[ky].inUse,
              "info": "A new version is available. Please update to new version now."
          }
      }
  
      if(arr.indexOf('users') > -1 && arr.indexOf('lookupdata') > -1)
      {
        ress.content.dataList = [{}]
        res.status(200).json(ress)
      }
      else
      {
        res.status(200).json(ress)
      }

		}
		else if(typeof api_versions[ky].nextVerAvailable !== 'undefined')
		{
		  let response = responseFormat.createResponseTemplate();
		  response = responseFormat.getResponseMessageByCodes('', { content: { mandatory: !api_versions[ky].inUse, info: 'A new version of  is available. Please update to new version now.'  } });		  
		  next();
		}
		else if(typeof api_versions[ky].nextVerAvailable == 'undefined')
		{
		  let response = responseFormat.createResponseTemplate();
		  response = responseFormat.getResponseMessageByCodes('', { content: {} });
		  next();
		}
		
		break;
			
	}
})



for(let i in api_versions)
{ 
  app.use(i, require('./versions/'+api_versions[i].path));
}



/**
 *  catch 404 and forward to error handler
 */
app.use(function (err, req, res, next) { 
	console.log('404 ERROR LOGGED', err)
    let response = responseFormat.createResponseTemplate();
      response = responseFormat.getResponseMessageByCodes(['common404'], { code: 404 });
      res.status(404).json(response);
});



/**
 *  error handler
 */

app.use(errorHandler);
//app.use(handle404); 


/**
 * Callback function initialize port
 */

 app.listen(config.PORT, () => {
      logger.info(`Using environment: ${config.node_env}...`);
      logger.info(`API server running on port ${config.PORT}...\n`);
  });
  
 
