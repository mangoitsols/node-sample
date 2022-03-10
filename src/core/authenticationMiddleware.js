import express from 'express';
import jwt from 'jsonwebtoken';
import responseFormat from './response-format';
import configContainer from '../config/localhost';
import routesConfig from './routes';
import CommonMethods from './common-methods';
import logger from './logger';
import accountModel from '../models/accounts/accounts-model';
import CrudOperationModel from '../models/common/crud-operation-model';
import { UserLoginDetail } from '../entities/accounts/user-login-detail';
import enums from './enums';

let app = express.Router();

let config = configContainer.loadConfig(),
  commonMethods = new CommonMethods(),
  crudOperationModel = new CrudOperationModel(),
  appRoutes = routesConfig.getRoutes();


app.use((req, res, next) => {

  let response = responseFormat.createResponseTemplate();
  let at = req.headers.authorization || req.headers.Authorization;
  req.headers.authorizationToken = at;
  // all header info validate 
  let headerParams = config.headerParams;
  let headerArr = Object.keys(headerParams);
  let reqHeader = req.headers;
  let reqHeaderArr = Object.keys(reqHeader).map(it => { return it.toLowerCase() });

  for (let i = 0; i < headerArr.length; i++) {
    if (headerParams[headerArr[i]] == 'required' && reqHeaderArr.indexOf(headerArr[i].toLowerCase()) < 0) {
      response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
      res.status(401).json(response);
      return;
    }
    else if (headerArr[i].toLowerCase() == 'version') {
      let os = enums.osTypes[(reqHeader.os || reqHeader.OS).toLowerCase()];
      if ([1, 2].indexOf(os) > -1) {
        let osValue = (reqHeader.os || reqHeader.OS).toLowerCase();
        let versionValue = req.headers.Version || req.headers.version;
        let versionSplitValue = versionValue.split('.');

        if (versionSplitValue.length != 3) {
          response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
          res.status(401).json(response);
          return;
        }
        else if (versionSplitValue.length == 3) {
          let deviceMandatoryVersion = '1.0.0';
          if (osValue == 'ios') {
            deviceMandatoryVersion = config.device_version.ios;
          }
          else if (osValue == 'android') {
            deviceMandatoryVersion = config.device_version.android;
          }

          let deviceMandatoryVersionSplitValue = deviceMandatoryVersion.split('.');
          for (let i = 0; i < versionSplitValue.length; i++) {
            if (parseInt(deviceMandatoryVersionSplitValue[i]) > parseInt(versionSplitValue[i])) {
              let ress = {
                "success": true,
                "code": 200,
                "message": "Processed",
                "description": "OK",
                "content": {
                  "dataList": [],
                  "messageList": {},
                  "mandatory": true,
                  "mandatoryVersion": deviceMandatoryVersion,
                  "info": "A new version is available. Please update to new version now."
                }
              }

              res.status(200).json(ress);
              return;
            }
          }
        }

      }
    }
  }


  // decode header Authorization
  if (at) {
    let accessToken = new Buffer.from(at, 'base64').toString('ascii');
    if (accessToken.indexOf(':') <= -1) {

      if (commonMethods.matchUrl(routesConfig.accessAndAuthUrl, req.originalUrl, req.method) && accessToken == config.apiAccessToken) {
        req.headers.ext = 1;
        next();
        return;
      }
      else {

        if (accessToken !== config.apiAccessToken) {
          response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
          res.status(401).json(response);
          return;
        }
        else {
          let excludArr = [];
          for (let i in routesConfig.excludeJwtPaths) {
            excludArr.push(routesConfig.excludeJwtPaths[i].url);
          }

          if (excludArr.indexOf(req.originalUrl) > -1) {
            next();
            return;
          }
          else {
            response = responseFormat.getResponseMessageByCodes(['common404'], { code: 404 });
            res.status(404).json(response);
            return;
          }

        }
      }

    }
    else {
      let apiAccessToken = accessToken.split(':')[0];
      let authToken = accessToken.split(':')[1];


      if (apiAccessToken !== config.apiAccessToken) {
        response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
        res.status(401).json(response);
        return;
      }

      jwt.verify(authToken, config.jwtSecretKey, function (err, decoded) {
        if (err) {
          // console.log(err); console.log(decoded);
          // if accessAndAuthUrl accessed with wrong token, request treated as non-logged in user
          if (commonMethods.matchUrl(routesConfig.accessAndAuthUrl, req.originalUrl, req.method) && apiAccessToken == config.apiAccessToken) {
            req.headers.ext = 1;
            next();
            return;
          }
          response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
          res.status(401).json(response);
          return;
        }
        else {

          req.tokenDecoded = decoded;

          let commonMethods = new CommonMethods();
          commonMethods.isUserLoggedIn(decoded.data.employeeDetailsId)
            .then((isuser) => {
              if (isuser == 1) {
                //check user id exists or not and status is active
                accountModel.getUserById(decoded.data.employeeDetailsId)
                  .then((isUsers) => {
                    if (isUsers) {
                      // if user is not from the allowed company, no need to go further
                      // if (config.allowedCompanyId.indexOf(isUsers.CompanyMaster_Id) !== -1 || enums.employeeType.inHouse === isUsers.Employee_Type) {
                      //   // continue
                      // } else {
                      //   response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
                      //   res.status(401).json(response);
                      //   return;
                      // }

                      accountModel.getCompanyDetailById(config.masterParentCompanyId)
                        .then((companyData) => {
                            if (companyData) {  
                                var allowedCompanies = companyData[0].AllowedCompanies.split(',').map(Number); 
                                //console.log(enums.employeeType.inHouse+"------"+isUsers.Employee_Type)
                                if (enums.employeeType.inHouse === isUsers.Employee_Type) {

                                  // continue. inHouse employee will be always allowed regardless masterCompanyId
                                }else if (config.masterParentCompanyId === isUsers.CompanyMaster_Id) {
                                    // continue. inHouse employee will be always allowed regardless masterCompanyId
                                }else if ( allowedCompanies.indexOf(isUsers.CompanyMaster_Id) < 0 ) {
                                  response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
                                  res.status(401).json(response);
                                  return;
                                }
                            }
                        })
                      // ------------------------------------------

                      req.tokenDecoded = decoded;
                      req.headers.apiAccessToken = apiAccessToken;
                      req.headers.authorization = "Bearer " + authToken;
                      req.headers.authorizationToken = at;

                      // update database with device login info
                      commonMethods.addUserDevice(reqHeader, decoded.data.employeeDetailsId, 1, function (rs) { })
                      next();
                      return;
                    }
                    else {
                      response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
                      res.status(401).json(response);
                      return;
                    }
                  })
              }
              else {
                // if accessAndAuthUrl accessed with expired token, request treated as non-logged in user
                if (commonMethods.matchUrl(routesConfig.accessAndAuthUrl, req.originalUrl, req.method) && apiAccessToken == config.apiAccessToken) {
                  req.headers.ext = 1;
                  next();
                  return;
                }
                response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
                res.status(401).json(response);
                return;
              }
            })
            .catch((error) => {
              logger.error('Error has occured in servr.js  // isUserLoggedIn section .', err);
              response = responseFormat.getResponseMessageByCodes(['common500'], { code: 500 });
              res.status(500).json(response);
              return;
            })
        }
      });
      return;

    }
  }
  else {
    response = responseFormat.getResponseMessageByCodes(['common401'], { code: 401 });
    res.status(401).json(response);
    return;
  }
  // next();
});
module.exports = app;