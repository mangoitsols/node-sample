/**
 *  -------Import all classes and packages -------------
 */
import configContainer from "../../config/localhost";
import { dbContext, Sequelize } from "../../core/db";
import { BenefitMaster } from "../../entities/benefits/benefits";
import enums from '../../core/enums';
import _ from 'lodash';
import CommonMethods from '../../core/common-methods';
import logger from '../../core/logger';
import CrudOperationModel from "../common/crud-operation-model";
import fs from 'fs';
import EmailModel from '../emails/emails-model';

import { OnBoardingEnvelopes } from "../../entities/employeeonboarding/onBoarding-envelopes";
import { OnBoardingEnvelopeSigners } from "../../entities/employeeonboarding/onBoarding-envelope-signers";
import { EmployeeDetails } from "../../entities";

// ----------- Hellesign Object created ---------------------------

let config = configContainer.loadConfig();
let commonMethods = new CommonMethods();
let crudOperationModel = new CrudOperationModel();

var hellosign = require('hellosign-sdk')({key: config.helloSign.apiKey});
var helloSignClientId = config.helloSign.clientId;

const emailModel = new EmailModel();


export default class EmployeeonboardingModel {

    constructor() {
        //
    }

    getAllTemplatesFromHelloSign(page, pageSize, title)
    {
        return new Promise((resolve, reject) => {
            hellosign.account.get()
            .then(function(response){
                
                // console.log('GETACCOUNT' , response);

                if(response.statusCode == 200)
                {
                    // As per discussion with ajay sir hellosign is not stops envelop to be created even if credit limit is reached.
                    // if(response.account.quotas.api_signature_requests_left > 0)
                    // {
                        hellosign.template.list({page : page, page_size : pageSize, query : title})
                        .then(function(resp){

                            if(resp.statusCode == 200)
                            {
                                resolve(resp.templates);
                            }
                            else
                            {
                                reject(resp)
                            }
                        }).catch(err => {
                            reject(err)
                        });
                    // }
                    // else
                    // {
                    //     reject('HelloSign Credit Limit Over')
                    // }
                }
                else
                {
                    reject(resp)
                }

                
            })
            .catch(function(err){
                reject(err)
            });
            
        })
    }

    getSignerOrderByTemplates(templateArray)
    {
        return new Promise((resolve, reject) => {
            
            hellosign.template.list()
            .then(function(resp){

                if(resp.statusCode == 200)
                {
                    let signerRoles = resp.templates.filter( item => {
                        return templateArray.indexOf(item.template_id) > -1;
                    }).map( item => {
                        return item.signer_roles;
                    });

                    let update = [];
                    let allRoles = _.unionBy(update, signerRoles, "name");

                    let signerOrder = Array.apply(null, {length: allRoles[0].length+1}).map(Number.call, Number);
                    signerOrder.shift(0);

                    resolve([{signerRoles : allRoles[0], signerOrder : signerOrder}]);
                }
                else
                {
                    reject(resp)
                }
            }).catch(err => {
                reject(err)
            });
        
        })
    }

    getDocumentByTemplateId(templateId)
    {
        return new Promise((resolve, reject) => {
            hellosign.template.get(templateId)
            .then(function(rs){ 
                resolve(rs.template.documents);
            }).catch(err => { 
                reject(err)
            })
        })
    }


    getHsDocumentUrlByTemplateId(templateId)
    {
        return new Promise((resolve, reject) => {
            
            hellosign.template.files(templateId, {get_url: true}, function(err, response){
                if(err)
                {
                    reject(err)
                }
                else
                {
                    resolve(response)
                }
            });

        })
        
    }

    createEnvelope(employeeDetailsId, envelopId)
    {
        let testMode = 1;
        if(config.node_env.toLowerCase() == 'production')
        {
            testMode = 0;
        }
        return new Promise((resolve, reject) => {

            hellosign.account.get()
            .then(function(response){
                
                if(response.statusCode == 200)
                {
                    // As per discussion with ajay sir hellosign is not stops envelop to be created even if credit limit is reached.
                    // if(response.account.quotas.api_signature_requests_left > 0)
                    // {
                        if(response.account.quotas.api_signature_requests_left <= enums.helloSign.requestLowLimit)
                        {
                            // send email to ajay sir to notify about hellosign request limit

                            let mailData = [
                                {name : "ServiceProvider", value : 'Hello Sign'},
                                {name : "Re-OrderLimit", value : enums.helloSign.requestLowLimit}
                            ];
                            let options = {        
                                mailTemplateCode : enums.emailConfig.codes.helloSign.creditLimit,
                                toMail: [{ mailId: '', displayName: '', configKeyName:'SUPPORTMAILID' }],
                                cccMail : [
                                    { mailId: enums.emailConfig.codes.eMails.ajaysingh, displayName: 'Ajay Singh'}
                                ],
                                placeHolders : mailData,
                                senderId: employeeDetailsId || 0
                            };
                        
                            emailModel.mail(options, 'employeeonboarding-model/createEnvelope')
                            .then( rs =>{ })

                        }

                        // get Envelop info

                        let query = "EXEC API_SP_GetEnvelopeInfo @EmployeeDetails_Id = " + employeeDetailsId + ", @envelopeId= " + envelopId ;
                        console.log(query)
                        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                        .then((details) => { 
                            let hsData = {};
                            let k = details[0]['envelopeId'];
                            let employee = [];
                            details.forEach(item => {
                                if(hsData[k])
                                {
                                    hsData[k]['signers'].push({
                                        email_address : item.signerEmail.trim(),
                                        name : item.signerName.trim(),
                                        role : item.signerRole,
                                        order : item.singerOrder
                                    })
                                }
                                else
                                {
                                    hsData[k] = {};
                                    hsData[k]['signers'] = [];
                                    hsData[k]['test_mode'] = testMode;
                                    hsData[k]['clientId'] = helloSignClientId;
                                    hsData[k]['template_ids'] = item.templateIds.trim().replace(/(^,)|(,$)/g, "").split(',');
                                    hsData[k]['subject'] = details[0].envelopeType;
                                    hsData[k]['message'] = details[0].envelopeType + 'Creation';
                                    hsData[k]['signers'].push({
                                        email_address : item.signerEmail,
                                        name : item.signerName,
                                        role : item.signerRole,
                                        order : item.singerOrder
                                    })
                                }

                                if(item.isEmployee)
                                {
                                    employee.push(item);
                                }
                          
                            })
                            
                            hsData = hsData[k];
                            
                            hellosign.signatureRequest.createEmbeddedWithTemplate(hsData)
                            .then(function(response){
                                
                                if(response.statusCode == 200)
                                {
                                    if(response.hasOwnProperty('warnings'))
                                    {
                                        // console.log('------------ warning-------------------', response.warnings)

                                        let mailData = [
                                            {name : "CandidateName", value : employee.length ? employee[0].signerName : ''},
                                            {name : "StepName", value : details[0].envelopeType}
                                        ];

                                        let options = {};
                                        if (details[0].OnboardingRepEmail){
                                            options = {        
                                                mailTemplateCode : enums.emailConfig.codes.helloSign.signerMissing,
                                                toMail: [{ mailId: details[0].OnboardingRepEmail, displayName: details[0].OnboardingRepFirstName}],
                                                ccMail: [
                                                    { mailId: enums.emailConfig.codes.eMails.ajaysingh, displayName: 'Ajay Singh'}
                                                ],
                                                placeHolders : mailData,
                                                senderId: employeeDetailsId || 0
                                            };
                                        }else{
                                            options = {        
                                                mailTemplateCode : enums.emailConfig.codes.helloSign.signerMissing,
                                                toMail: [{ mailId: details[0].hrEmail, displayName: details[0].hrFirstName}],
                                                ccMail: [
                                                    { mailId: enums.emailConfig.codes.eMails.ajaysingh, displayName: 'Ajay Singh'}
                                                ],
                                                placeHolders : mailData,
                                                senderId: employeeDetailsId || 0
                                            };
                                        }
                                                                            
                                        emailModel.mail(options, 'employeeonboarding-model/createEnvelope createEnvelope-warning')
                                        .then( rs =>{ })

                                    }
                        

                                    // logger.error(response);
                                    
                                    resolve({
                                            helloSignData : response.signature_request, 
                                            dbEnvelopeId : k, 
                                            envelopeTypeId : details[0]['envelopeTypeId'],
                                            placementTrackerId : details[0]['placementTrackerId'],
                                            companyMasterId : details[0]['companyMasterId']
                                    });
                                }
                                else
                                {
                                    commonMethods.catchError('employeeonboarding-model/createEnvelope - not 200 : ', response);
                                    reject('Hellosign error'+response.statusCode)
                                }
                            })
                            .catch(function(err){ 
                                reject(err);
                            })
                            
                            

                        })

                        
                    //}
                    // else
                    // {
                    //     reject('HelloSign Credit Limit Over');
                    // }
                }
                else
                {
                    reject(resp);
                }

                
            })
            .catch(function(err){
                reject(err);
            });
            
        })
    }

    
    getOfferLetter(employeeDetailsId, authAccessToken)
    {
        let query = "EXEC API_SP_GetCandidateOfferLetter @EmployeeDetails_Id = " + employeeDetailsId + " ";

        let offerLetterVars = enums.uploadType.offerLetter;

        //let docPath = config.portalHostUrl + config.documentBasePath + offerLetterVars.path + '/';
        let docPath = config.dmsDocumentUrl;

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            if(details.length)
            {
                //details[0]['offerLetterPath'] = docPath + details[0].offerLetterName;
                details[0]['offerLetterPath'] = docPath +  details[0].dmsId+'?slp='+authAccessToken;
                return details;
            }
            else
            {
                return [];
            }
            
        })
    }

    getSignUrl(signatureId)
    {
        return new Promise((resolve, reject) => {

            if(signatureId)
            {
                hellosign.embedded.getSignUrl(signatureId)
                .then(function(response){ 
                    resolve(response.embedded.sign_url);
                })
                .catch(function(err){ 
                    if(err.message == 'This request has already been signed'){
                        resolve('alreadySigned');
                    }else{
                        reject(err)
                    }
                });
            }
            else
            {
                reject('Invalid signature id')
            }
        })
    }


    callSignUrl_backup(employeeDetailsId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetEnvelopeInfo @EmployeeDetails_Id = " + employeeDetailsId + ", @envelopeId="+null ;
    
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                return rs;
            })
            .then(envelopeData => {
                
                let query = "EXEC API_SP_GetEmployeeProjects @EmployeeDetailsId=\'" + employeeDetailsId + "\', @IsCurrentProject=\'" + 1 + "\' ";
                dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((project) => { 
    
                    let rs = envelopeData;

                    let bgStatus = rs.length ? rs[0].bgStatus : 0;
                    let clientStatus = rs.length ? rs[0].clientStatus : 0;
                    let benefitStatus = rs.length ? rs[0].benefitStatus : 0;
                    // let offerLetterNa = [enums.helloSign.offerLetterStatus.completed, enums.helloSign.offerLetterStatus.na];
                    let bgCheckNa = [enums.helloSign.bgCheckStatus.na];
                    let clientDocNa = [enums.helloSign.clientDocStatus.na];
                    let benefitNa = [enums.helloSign.benefitStatus.na, enums.helloSign.benefitStatus.ni];

                    let responseObj = {
                        callSignUrl : 0, 
                        createEnvelope : 0,
                        step : rs.length ? rs[0].envelopeOrder : 0,
                        viewed : rs.length ? rs[0].viewedAt : '',
                        envTemplatedId : rs.length ? rs[0].envelopeTypeId : 0,
                        envelopeType : rs.length ? rs[0].envelopeType : ''
                    }
                    
                    if(rs.length)
                    {
                        if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.bgCheck  && bgCheckNa.indexOf(bgStatus) < 0)
                        {
                            if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                            {
                                // check for signer order
                                if(rs[0].isEmployee == 1)
                                {
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 1;
                                    resolve(responseObj);
                                }
                                else
                                {
                                    resolve(responseObj);
                                }
                            }
                            else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                            {
                                // check for employee signed document or not 
                                let employeeSign = rs.filter( item => {
                                    return item.isEmployee
                                })
    
                                if(employeeSign[0].signedAt)
                                {
                                    resolve(responseObj);
                                }
                                else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                                {
                                    resolve(responseObj);
                                }
                                else 
                                {
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 0;
                                    resolve(responseObj);
                                }
                            }
                        }
                        else if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.clientDoc && clientDocNa.indexOf(clientStatus) < 0)
                        {
                            if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                            {
                                // check for signer order
                                if(rs[0].isEmployee == 1)
                                {
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 1;
                                    resolve(responseObj);
                                }
                                else
                                {
                                    resolve(responseObj);
                                }
                            }
                            else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                            {
                                // check for employee signed document or not 
                                let employeeSign = rs.filter( item => {
                                    return item.isEmployee
                                })
    
                                if(employeeSign[0].signedAt)
                                {
                                    resolve(responseObj);
                                }
                                else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                                { 
                                    resolve(responseObj);
                                }
                                else 
                                { 
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 0;
                                    resolve(responseObj);
                                }
                            }
                        }
                        else if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.benefit && benefitNa.indexOf(benefitStatus) < 0)
                        {
                            // check 30 days from project start date Condition here for benefit type document
                            
                            // if(project.length)
                            // {
                                
                                // if(commonMethods.getDifferenceInDays(project[0].startDate, new Date()) > 30)
                                // {
                                    if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                                    {
                                        // check for signer order
                                        if(rs[0].isEmployee == 1)
                                        {
                                            responseObj.callSignUrl = 1;
                                            responseObj.createEnvelope = 1;
                                            resolve(responseObj);
                                        }
                                        else
                                        {
                                            resolve(responseObj);
                                        }
                                    }
                                    else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                                    {
                                        // check for employee singed document or not 
                                        let employeeSign = rs.filter( item => {
                                            return item.isEmployee
                                        })
    
                                        if(employeeSign[0].signedAt)
                                        {
                                            resolve(responseObj);
                                        }
                                        else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                                        {
                                            resolve(responseObj);
                                        }
                                        else
                                        {
                                            responseObj.callSignUrl = 1;
                                            responseObj.createEnvelope = 0;
                                            resolve(responseObj);
                                        }
                                    }
                                // }
                                // else
                                // {
                                //     resolve(responseObj);
                                // }
                            // }
                            // else
                            // {
                            //     resolve(responseObj);
                            // }
    
                        }
                        else
                        {
                            resolve(responseObj);
                        }
                    }
                    else
                    {
                        resolve(responseObj);
                    }
                })
    
            })
        })
    }


    callSignUrl(employeeDetailsId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetEnvelopeInfo @EmployeeDetails_Id = " + employeeDetailsId + ", @envelopeId="+null ;
    
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                return rs;
            })
            .then(envelopeData => {
                
                let query = "EXEC API_SP_GetEmployeeProjects @EmployeeDetailsId=\'" + employeeDetailsId + "\', @IsCurrentProject=\'" + 1 + "\' ";
                dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((project) => { 
    
                    let rs = envelopeData;

                    let bgStatus = rs.length ? rs[0].bgStatus : 0;
                    let clientStatus = rs.length ? rs[0].clientStatus : 0;
                    let benefitStatus = rs.length ? rs[0].benefitStatus : 0;
                    // let offerLetterNa = [enums.helloSign.offerLetterStatus.completed, enums.helloSign.offerLetterStatus.na];
                    let bgCheckNa = [enums.helloSign.bgCheckStatus.na];
                    let clientDocNa = [enums.helloSign.clientDocStatus.na];
                    let benefitNa = [enums.helloSign.benefitStatus.na, enums.helloSign.benefitStatus.ni];

                    let responseObj = {
                        callSignUrl : 0, 
                        createEnvelope : 0,
                        step : rs.length ? rs[0].envelopeOrder : 0,
                        viewed : rs.length ? rs[0].viewedAt : '',
                        envTemplatedId : rs.length ? rs[0].envelopeTypeId : 0,
                        envelopeType : rs.length ? rs[0].envelopeType : ''
                    }
                    
                    if(rs.length)
                    {
                        if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.bgCheck  && bgCheckNa.indexOf(bgStatus) < 0)
                        {
                            if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                            {
                                // check for signer order
                                if(rs[0].isEmployee == 1)
                                {
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 1;
                                    resolve(responseObj);
                                }
                                else
                                {
                                    resolve(responseObj);
                                }
                            }
                            else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                            {
                                // check for employee signed document or not 
                                let employeeSign = rs.filter( item => {
                                    return item.isEmployee
                                })
    
                                if(employeeSign[0].signedAt)
                                {
                                    resolve(responseObj);
                                }
                                else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                                {
                                    resolve(responseObj);
                                }
                                else 
                                {
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 0;
                                    resolve(responseObj);
                                }
                            }
                        }
                        else if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.clientDoc && clientDocNa.indexOf(clientStatus) < 0)
                        {
                            if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                            {
                                // check for signer order
                                if(rs[0].isEmployee == 1)
                                {
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 1;
                                    resolve(responseObj);
                                }
                                else
                                {
                                    resolve(responseObj);
                                }
                            }
                            else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                            {
                                // check for employee signed document or not 
                                let employeeSign = rs.filter( item => {
                                    return item.isEmployee
                                })
    
                                if(employeeSign[0].signedAt)
                                {
                                    resolve(responseObj);
                                }
                                else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                                { 
                                    resolve(responseObj);
                                }
                                else 
                                { 
                                    responseObj.callSignUrl = 1;
                                    responseObj.createEnvelope = 0;
                                    resolve(responseObj);
                                }
                            }
                        }
                        else if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.benefit && benefitNa.indexOf(benefitStatus) < 0)
                        {
                            // check 30 days from project start date Condition here for benefit type document
                            
                            // if(project.length)
                            // {
                                
                                // if(commonMethods.getDifferenceInDays(project[0].startDate, new Date()) > 30)
                                // {
                                    if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                                    {
                                        // check for signer order
                                        if(rs[0].isEmployee == 1)
                                        {
                                            responseObj.callSignUrl = 1;
                                            responseObj.createEnvelope = 1;
                                            resolve(responseObj);
                                        }
                                        else
                                        {
                                            resolve(responseObj);
                                        }
                                    }
                                    else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                                    {
                                        // check for employee singed document or not 
                                        let employeeSign = rs.filter( item => {
                                            return item.isEmployee
                                        })
    
                                        if(employeeSign[0].signedAt)
                                        {
                                            resolve(responseObj);
                                        }
                                        else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                                        {
                                            resolve(responseObj);
                                        }
                                        else
                                        {
                                            responseObj.callSignUrl = 1;
                                            responseObj.createEnvelope = 0;
                                            resolve(responseObj);
                                        }
                                    }
                                // }
                                // else
                                // {
                                //     resolve(responseObj);
                                // }
                            // }
                            // else
                            // {
                            //     resolve(responseObj);
                            // }
    
                        }
                        else
                        {
                            resolve(responseObj);
                        }
                    }
                    else
                    {
                        resolve(responseObj);
                    }
                })
    
            })
        })
    }

    getEnvelopeInfo(employeeDetailsId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetEnvelopeInfo @EmployeeDetails_Id = " + employeeDetailsId + ", @envelopeId="+null ;
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    getSignerInfoBySignerId(signerId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetSignerInfo @signerId = " + signerId + " ";
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }


    signerEvent(data, signerSignatureId)
    {
        return new Promise( resolve => {

            crudOperationModel.updateAll(OnBoardingEnvelopeSigners, data, {envelopeSignerId : signerSignatureId})
            .then( rs => {
                return signerSignatureId
            })
            .then( signerSignatureId => {
                let query = "EXEC API_SP_GetSignerInfoByHSSignerId @hsSignerId = '" + signerSignatureId + "' ";
        
                dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((rs) => { 
                    if(rs.length)
                    {
                        resolve(rs);
                    }
                    else
                    {
                        resolve([]);
                    }
                })
            })
            .catch( err => {
                reject(err)
            })
        })
    }

    envelopeEvent(data, helloSignEnvelopeId)
    {
        return new Promise( resolve => {
                
            crudOperationModel.updateAll(OnBoardingEnvelopes, data, {signingProviderEnvelopeId : helloSignEnvelopeId})
            .then( rs => {
                resolve(rs);
            }).catch( err => {
                reject(err)
            })
        })
    }

    getEnvelopeFiles(signatureRequestId)
    {
        return new Promise( (resolve, reject) => {
            
            hellosign.signatureRequest.download(signatureRequestId, {file_type: 'zip'}, function(err, response){
               
                if(err)
                {
                    reject(err);
                }
                else if(response.statusCode == 200)
                {
                    let filePath = '';
                    if(config.node_env == 'localhost')
                    {
                        filePath = __dirname+'/../../../Documents/';
                    }
                    else
                    {
                        filePath = __dirname+'/../../Documents/';
                    }
                    let timestamp = new Date().getTime();
                    let fileName = signatureRequestId+'_'+timestamp+'_files.zip';
                    
                    let file = fs.createWriteStream(filePath+fileName);
                    response.pipe(file);
                    file.on('finish', function() {
                        file.close();
                        resolve({success: true , fileName : fileName, message : ''})
                    });
                }
                else
                {
                    resolve({success: false , fileName : '', message : 'File Not Prepared'})
                }
            });
        })
    }


    getTemplateDetails(templateId)
    {
        return new Promise((resolve, reject) => {
            hellosign.template.get(templateId)
            .then(function(rs){ 
                resolve(rs);
            }).catch(err => { 
                reject(err)
            })
        })
        
    }

    getEnvelopeDetails(hsSignerId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetEnvelopeDetailBySignerId @hsSignerId = '" + hsSignerId + "' " ;
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    getEnvelopeDetailsByPtId(placementTrackerId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetEnvelopeDetailByPlacementTackerId @placementTrackerId = " + placementTrackerId + " " ;
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    getCompletedEnvelope(placementTrackerId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetLatestCompleteEnvelope @placementTrackerId = " + placementTrackerId + " " ;
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    getAttachements(placementTrackerId, employeeDetailsId)
    {
        return new Promise( (resolve, reject) => {

            let query1 = "EXEC API_SP_GetDocumentForEnvelope @placementTrackerId = " + placementTrackerId + " "; 
            return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
            .then((rs1) => { 
                if(rs1.length)
                {
                    crudOperationModel.findModelByCondition(EmployeeDetails, {employeeDetailsId : employeeDetailsId})
                    .then( emp => {
                        
                        let empVars = enums.uploadType.employeeDocs;
                        let ptVars = enums.uploadType.ptDocs;
                        let basePath = config.portalHostUrl + config.documentBasePath + empVars.path + '/' + employeeDetailsId + '/';
                        rs1.forEach( item => {
                            item['docPath'] = item.dmsId ? basePath + item.fileName : '';
                        })
                        resolve(rs1);
                    })
    
                }
                else
                {
                    resolve([]);
                }
            })
        })
    }

    getNextSigner(envelopeId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetNextSignerByEnvelopeId @envelopeId = " + envelopeId + " " ;
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    getEnvDetails(placementTrackerId) {
        let query = "EXEC API_SP_GetEnvDtlByPlacementTracker @placementTrackerId=" + placementTrackerId + "";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((rs) => {
            return rs;
        })

    }

    getEmployeeAssociation(employeeDetailsId)
    {
        let query = "EXEC API_SP_GetEmployeeAssociation @EmployeeDetails_Id = " + employeeDetailsId + " ";

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
           return details;
        })
    }

    authCode()
    {
        let query = 'select ED.EmployeeDetails_id employeeDetailsId, ED.email_id emailId  from EmployeeDetails ED where (ED.isAccountActivated is null or ED.isAccountActivated = 0) and ED.Employee_Type in (1222, 1223) and ED.emp_status = \'A\' and ED.EmployeeDetails_Id not in (select EmployeeDetails_Id from EmployeeAccessToken where EmployeeDetails_Id is not null)';

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
           return details;
        })
    }

      
    callVendorSignUrl(placementTrackerId, envelopeId) {
        return new Promise( resolve => {
            let query = "EXEC API_SP_GetVendorEnvelopeInfoByTrackerId @placementTrackerId = " + placementTrackerId + ", @envelopeId="+envelopeId ;

            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                return rs;
            })
            .then(envelopeData => {            
                let rs = envelopeData;
                //let bgStatus = rs.length ? rs[0].bgStatus : 0;
                //let clientStatus = rs.length ? rs[0].clientStatus : 0;
                //let benefitStatus = rs.length ? rs[0].benefitStatus : 0;
                //let bgCheckNa = [enums.helloSign.bgCheckStatus.na];
                //let clientDocNa = [enums.helloSign.clientDocStatus.na];
                //let benefitNa = [enums.helloSign.benefitStatus.na, enums.helloSign.benefitStatus.ni];

                let responseObj = {
                    callSignUrl : 0, 
                    createEnvelope : 0,
                    step : rs.length ? rs[0].envelopeOrder : 0,
                    viewed : rs.length ? rs[0].viewedAt : '',
                    envTemplatedId : rs.length ? rs[0].envelopeTypeId : 0,
                    envelopeType : rs.length ? rs[0].envelopeType : ''
                }
                resolve(responseObj);
                /*if(rs.length)
                {
                    if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.bgCheck  && bgCheckNa.indexOf(bgStatus) < 0)
                    { 
                        if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                        {
                            // check for signer order
                            if(rs[0].isEmployee == 1)
                            {
                                responseObj.callSignUrl = 1;
                                responseObj.createEnvelope = 1;
                                resolve(responseObj);
                            }
                            else
                            {
                                resolve(responseObj);
                            }
                        }
                        else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                        {
                            // check for employee signed document or not 
                            let employeeSign = rs.filter( item => {
                                return item.isEmployee
                            })

                            if(employeeSign[0].signedAt)
                            {
                                resolve(responseObj);
                            }
                            else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                            {
                                resolve(responseObj);
                            }
                            else 
                            {
                                responseObj.callSignUrl = 1;
                                responseObj.createEnvelope = 0;
                                resolve(responseObj);
                            }
                        }
                    }
                    else if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.clientDoc && clientDocNa.indexOf(clientStatus) < 0)
                    {
                        if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                        {
                            // check for signer order
                            if(rs[0].isEmployee == 1)
                            {
                                responseObj.callSignUrl = 1;
                                responseObj.createEnvelope = 1;
                                resolve(responseObj);
                            }
                            else
                            {
                                resolve(responseObj);
                            }
                        }
                        else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                        {
                            // check for employee signed document or not 
                            let employeeSign = rs.filter( item => {
                                return item.isEmployee
                            })

                            if(employeeSign[0].signedAt)
                            {
                                resolve(responseObj);
                            }
                            else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                            { 
                                resolve(responseObj);
                            }
                            else 
                            { 
                                responseObj.callSignUrl = 1;
                                responseObj.createEnvelope = 0;
                                resolve(responseObj);
                            }
                        }
                    }
                    else if(rs[0].envelopeTypeId == enums.helloSign.envelopeType.benefit && benefitNa.indexOf(benefitStatus) < 0)
                    {
                        if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft)
                        {
                            // check for signer order
                            if(rs[0].isEmployee == 1)
                            {
                                responseObj.callSignUrl = 1;
                                responseObj.createEnvelope = 1;
                                resolve(responseObj);
                            }
                            else
                            {
                                resolve(responseObj);
                            }
                        }
                        else if(rs[0].envelopeStatus == enums.helloSign.envelopStatus.created)
                        {
                            // check for employee singed document or not 
                            let employeeSign = rs.filter( item => {
                                return item.isEmployee
                            })

                            if(employeeSign[0].signedAt)
                            {
                                resolve(responseObj);
                            }
                            else if(rs[0].isEmployee != 1 && !rs[0].signedAt)
                            {
                                resolve(responseObj);
                            }
                            else
                            {
                                responseObj.callSignUrl = 1;
                                responseObj.createEnvelope = 0;
                                resolve(responseObj);
                            }
                        }
                    }
                    else
                    {
                        resolve(responseObj);
                    }
                }
                else
                {console.log('------5')
                    resolve(responseObj);
                }*/    
            })
        })
    }


}