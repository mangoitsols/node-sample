import { dbContext, Sequelize } from "../../core/db";
import logger from '../../core/logger';
import enums from '../../core/enums';
import crypto from 'crypto';
import moment from 'moment';
import CommonMethods from '../../core/common-methods';
import configContainer from "../../config/localhost";
import fs from 'fs';
import path from 'path';
import CrudOperationModel from '../common/crud-operation-model';
import { OnBoardingVendorEnvelopes } from "../../entities/vendoronboarding/vendoronboarding-envelopes";
import { OnBoardingVendorEnvelopeSigners } from "../../entities/vendoronboarding/vendoronboarding-envelope-signers";
import EmailModel from '../emails/emails-model';
import request from 'request';
import EmployeeonboardingModel from '../../models/employeeonboarding/employeeonboarding-model';


let commonMethods = new CommonMethods(),
    crudOperationModel = new CrudOperationModel(),
    employeeonboardingModel = new EmployeeonboardingModel(),
    config = configContainer.loadConfig();
let masterCompanyIds = config.allowedCompanyId.join(',');
var hellosign = require('hellosign-sdk')({key: config.helloSign.apiKey});
var helloSignClientId = config.helloSign.clientId;
const emailModel = new EmailModel();

export default class VendorOnboardingModel {
    constructor() { }

    /**
     * verifyOnboardingVendor
     * @param {*} placementTrackerId : vendor placement Tracker Id 
     * @param {*} email : vendor email id
     */
    verifyOnboardingVendor(placementTrackerId,email) {
        let query = "select * from PT_vendor_details where PlacementTracker_Id = " +placementTrackerId + " AND Email = '" + email + "' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch((error) => {
                return [];
            });
    }

    /**
     * getVendorDetailByPlacementTrackerId
     * @param {*} placementTrackerId : vendor placement Tracker Id      
     */
    getVendorDetailByPlacementTrackerId(placementTrackerId) {

        let query = "select EmployeeDetails_Id from PT_Consultant_Details where PlacementTracker_Id = " +placementTrackerId + " ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch((error) => {
                return [];
            });
    }

    /**
     * getVendorDetailByPlacementTrackerId
     * @param {*} placementTrackerId : vendor placement Tracker Id      
     */
    getEmployeeDetailByPlacementTrackerId(placementTrackerId) {
        let query = "Select FromEmployeeDetails_Id from Resume_master where Resume_Id = (Select CandidateResume_Id from Job_Resume where PlacementTracker_Id = " + placementTrackerId + " )";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch((error) => {
                return [];
            });
    }


    /**
     * getVendorIdByPlacementTrackerId
     * @param {*} placementTrackerId : vendor placement Tracker Id      
     */
    getVendorIdByPlacementTrackerId(placementTrackerId) {

        let query = "select Vendor_Id from PT_vendor_details where PlacementTracker_Id = " +placementTrackerId + " ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch((error) => {
                return [];
            });
    }

    /**
     * verifyOnboardingVendorStatus
     * @param {*} placementTrackerId : vendor placement Tracker Id 
     */
    verifyOnboardingVendorStatus(placementTrackerId) {
        let query = "select * from OnBoarding_Vendor_Envelopes Where PlacementTracker_Id = " +placementTrackerId + " ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch((error) => {
                return [];
            });
    }

    /**
     * Get UserProfile By placementTrackerId
     * @param {*} placementTrackerId : logged in employee details id 
     */
    getVendorDetailsByPlacementTrackerId(placementTrackerId, onboardingenvelopeId, authAccessToken) {
        let envelopeId = 0;
        let onboardingComplete = 1;
        let offerPass = 1;
        let isOfferLetter = 1;
        let employeeDetailsId = null;

        return new Promise((resolve, reject) => {
            let emp = {};
            let query1 = "EXEC API_SP_GetPlacementsByTrackerId @placementTrackerId = " + placementTrackerId + " ";
            return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                .then(pt => {                   
                    if (pt.length) {
                        let comp = pt.filter(itm => {
                            return itm.placementStatus == 3;
                        });                       
                        emp['empOnboardingStatus'] = comp.length ? 'Completed' : 'Pending';
                    }
                    else {
                        emp['empOnboardingStatus'] = 'Not applicable';
                    }
                    return emp;
                })
                .then(emp => {
                    employeeonboardingModel.callVendorSignUrl(placementTrackerId, onboardingenvelopeId)
                        .then(rs => {                           
                            emp['employeeOnboarding'] = {
                                onboarding: 1,
                                callSignUrl: rs.callSignUrl,
                                step: rs.step,
                                stepName: rs.envelopeType,
                                stages: [],
                                viewed: rs.viewed ? 1 : 0,
                                envType: rs.envTemplatedId,
                                startDate: rs.length ? rs[0].startDate : ''
                            };
                            emp.employeeOnboarding.attachments = [];                           
                            return emp;
                        })
                        .then(emp => {
                            let query1 = "EXEC API_SP_GetVendorDocumentForEnvelope @placementTrackerId = " + placementTrackerId + " ";
                            return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                                .then((rs1) => {

                                    let uploadedDocCount = 0;
                                    let empVars = enums.uploadType.employeeDocs;
                                    let ptVars = enums.uploadType.ptDocs;
                                    //let basePath = config.portalHostUrl + config.documentBasePath + empVars.path + '/';
                                    let basePath = config.dmsDocumentUrl;
                                    rs1.forEach(item => {
                                        let code = item.EmpClientVendor_Id ? item.EmpClientVendor_Id : '';
                                        authAccessToken = (authAccessToken.length < 40 ) ? "|||"+commonMethods.encrypt(code) :authAccessToken;
                                        item['docPath'] = item.dmsId ? basePath + item.dmsId+'?slp='+authAccessToken : '';
                                        uploadedDocCount = item.dmsId ? ++uploadedDocCount : uploadedDocCount;
                                    })
                                    onboardingComplete = uploadedDocCount != rs1.length ? 0 : onboardingComplete;
                                    if (rs1.length) {
                                        emp['empOnboardingDocStatus'] = uploadedDocCount == rs1.length ? 'Completed' : 'Pending';
                                    }
                                    // emp.employeeOnboarding.attachments = rs1.length && emp.employeeOnboarding.envType == enums.helloSign.envelopeType.clientDoc ? rs1 : [];
                                    emp.employeeOnboarding.attachments = rs1.length ? rs1 : [];
                                    return emp;
                                })
                                .then(emp => {
                                    let query1 = "EXEC API_SP_GetVendorEnvelopesByPlacementTrackerId @placementTrackerId = " + placementTrackerId + " ";
                                    return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                                        .then((rs2) => {
                                            if (rs2.length) {

                                                let o = [];

                                                for (let i in rs2) {                                                    
                                                    let item = rs2[i];
                                                    //console.log('item--------')
                                                    //console.log(item);                                                 
                                                    let fileUrl = '';// item.path ? 'https://'+config.helloSign.apiKey+':@api.hellosign.com'+(item.path.replace(/final_copy/g, "files")) : '';
                                                    let message = 'Awaiting Signature';
                                                    let info = '';                                                    

                                                    if (item.envelopeStatus == enums.helloSign.envelopStatus.completed) {
                                                        message = 'COMPLETED';
                                                    }
                                                    else if (item.signed) {
                                                        message = 'SIGNED'
                                                    }
                                                    else if (!item.signer) {
                                                        message = 'Awaiting signature';
                                                    }
                                                    //console.log(enums.helloSign.envelopeType)
                                                    
                                                    //if (item.bg != 0) {
                                                        onboardingComplete = !item.signed && item.envelopeStatus != enums.helloSign.envelopStatus.completed ? 0 : onboardingComplete;
                                                        message = item.envelopeStatus == enums.helloSign.envelopStatus.completed ? 'COMPLETED' : message;
                                                        info = (!item.signed && item.signerOrder > 1) && !item.otherSigned ? 'Awaiting ' + item.signerRole.toLowerCase() + ' signature' : '';
                                                        let callSignUrl = 0;
                                                        if ((item.signerOrder == 1 && !item.signed) && item.envelopeStatus != enums.helloSign.envelopStatus.completed) {
                                                            callSignUrl = 1;
                                                        }

                                                        if ((item.signerOrder > 1 && item.otherSigned) && !item.signed) {
                                                            callSignUrl = 1;
                                                        }
                                                        o.push({
                                                            title: item.envelopeType,
                                                            status: message,
                                                            path: fileUrl,
                                                            step: item.envelopeOrder,
                                                            isComplete: item.signed || item.envelopeStatus == enums.helloSign.envelopStatus.completed ? 1 : 0,
                                                            callSignUrl: callSignUrl,
                                                            envelopeTypeId: item.envelopeTypeId,
                                                            info: info,
                                                            envId: item.envId
                                                        })
                                                    //}
                                                }

                                                // check onboarding completed if all step signed and all document uploaded
                                                if (emp.employeeOnboarding.onboarding) {
                                                    emp.employeeOnboarding.onboarding = ~~!onboardingComplete && isOfferLetter;
                                                    if (emp.employeeOnboarding.onboarding) {
                                                        emp['empOnboardingStatus'] = 'Pending';
                                                    } else {
                                                        emp['empOnboardingStatus'] = 'Completed';
                                                    }
                                                }                                                
                                                Array.prototype.push.apply(emp.employeeOnboarding.stages, o);
                                                resolve(emp);
                                            }
                                            else {
                                                if (emp.employeeOnboarding.onboarding) {
                                                    emp.employeeOnboarding.onboarding = ~~!onboardingComplete && isOfferLetter;

                                                    if (emp.employeeOnboarding.onboarding) {
                                                        emp['empOnboardingStatus'] = 'Pending';
                                                    } else {
                                                        emp['empOnboardingStatus'] = 'Completed';
                                                    }
                                                }
                                                resolve(emp)
                                            }
                                        })
                                })
                        })
                })
        })

    }

    /**
     * createVendorEnvelope
     * @param {*} placementTrackerId : placement Tracker Id
     * @param {*} envelopId : envelop id 
     */

    createVendorEnvelope(placementTrackerId, envelopeId)
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
                            senderId: 0
                        };
                    
                        emailModel.mail(options, 'vendoronboarding-model/createVendorEnvelope')
                        .then( rs =>{ })

                    }

                    // get Envelop info

                    let query = "EXEC API_SP_GetVendorEnvelopeInfoByTrackerId @placementTrackerId = " + placementTrackerId + ", @envelopeId= " + envelopeId ;
                    console.log(query)
                    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                    .then((details) => { 
                        let hsData = {};
                        let k = details[0]['envelopeId'];
                        let vendor = [];
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
                            if(item.isVendor)
                            {
                                vendor.push(item);
                            }
                      
                        })
                        
                        hsData = hsData[k];
                        /*console.log('hsData')
                        console.log(hsData)*/
                        
                        hellosign.signatureRequest.createEmbeddedWithTemplate(hsData)
                        .then(function(response){                           
                            
                            if(response.statusCode == 200)
                            {
                                if(response.hasOwnProperty('warnings'))
                                {
                                    // console.log('------------ warning-------------------', response.warnings)

                                    let mailData = [
                                        {name : "CandidateName", value : vendor.length ? vendor[0].signerName : ''},
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
                                            senderId: 0
                                        };
                                    }else{
                                        options = {        
                                            mailTemplateCode : enums.emailConfig.codes.helloSign.signerMissing,
                                            toMail: [{ mailId: details[0].hrEmail, displayName: details[0].hrFirstName}],
                                            ccMail: [
                                                { mailId: enums.emailConfig.codes.eMails.ajaysingh, displayName: 'Ajay Singh'}
                                            ],
                                            placeHolders : mailData,
                                            senderId: 0
                                        };
                                    }
                                
                                    emailModel.mail(options, 'vendoronboarding-model/createVendorEnvelope createVendorEnvelope-warning')
                                    .then( rs =>{ })

                                }
                    

                                // logger.error(response);
                                /*console.log('response------------------')
                                console.log(response)*/
                                /* console.log('=====================================')
                                console.log('-------signature_request-----------')
                                console.log(response.signature_request)
                                console.log('=====================================')*/
                                
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
                                commonMethods.catchError('vendoronboarding-model/createVendorEnvelope - not 200 : ', response);
                                reject('Hellosign error'+response.statusCode)
                            }
                        })
                        .catch(function(err){ 
                            reject(err);
                        }) 
                    })
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


    /**
     * getSignUrl
     * @param {*} signatureId : signature Id
     */

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

    /**
     * getEnvelopeFiles
     * @param {*} signatureRequestId : signature Request Id
     */

    getEnvelopeFiles(signatureRequestId)    {

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
                        //filePath = __dirname+'/../../../Documents/';
                        filePath = path.join(__dirname+'/../../Documents/');
                    }
                    else
                    {
                        //filePath = __dirname+'/../../Documents/';
                        filePath = path.join(__dirname+'/../../Documents/');
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

    /**
     * getAllTemplatesFromHelloSign
     * @param {*} page : page
     * @param {*} pageSize : pageSize
     * @param {*} title : title
     */
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


    /**
     * getDocumentByTemplateId
     * @param {*} templateId : templateId
     */

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


    getSignerInfoBySignerId(signerId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetSignerInfoForVendor @signerId = " + signerId + " ";
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
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

    signerEvent(data, signerSignatureId) {
        return new Promise( resolve => {
            crudOperationModel.updateAll(OnBoardingVendorEnvelopeSigners, data, {envelopeSignerId : signerSignatureId})
            .then( rs => {
                return signerSignatureId
            })
            .then( signerSignatureId => {
                let query = "EXEC API_SP_GetVendorSignerInfoByHSSignerId @hsSignerId = '" + signerSignatureId + "' ";
       
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

    getEnvelopeDetails(hsSignerId){
        return new Promise( resolve => {
            let query = "EXEC API_SP_GetVendorEnvelopeDetailBySignerId @hsSignerId = '" + hsSignerId + "' " ;    
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    envelopeEvent(data, helloSignEnvelopeId){
        return new Promise( resolve => {            
            crudOperationModel.updateAll(OnBoardingVendorEnvelopes, data, {signingProviderEnvelopeId : helloSignEnvelopeId})
            .then( rs => {
                resolve(rs);
            }).catch( err => {
                reject(err)
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

    getCompletedEnvelope(placementTrackerId) {
        return new Promise( resolve => {
            let query = "EXEC API_SP_GetVendorLatestCompleteEnvelope @placementTrackerId = " + placementTrackerId + " " ;
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }


    getNextSigner(envelopeId)
    {
        return new Promise( resolve => {

            let query = "EXEC API_SP_GetNextVendorSignerByEnvelopeId @envelopeId = " + envelopeId + " " ;
        
            dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((rs) => { 
                resolve(rs);
            })
        })
    }

    /**
     * getDocumentTypeByDocId
     * @param {*} docId : document Id 
     */
    getDocumentTypeByDocId(docId) {
        let query = "select Document_Type from DOCUMENT_MASTER where DOCUMENT_ID = " +docId + " ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch((error) => {
                return [];
            });
    }


}