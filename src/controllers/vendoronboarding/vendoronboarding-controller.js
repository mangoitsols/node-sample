/**
 *  -------Import all classes and packages -------------
 */
// call models
import VendorOnboardingModel from '../../models/vendoronboarding/vendoronboarding-model';
import CrudOperationModel from '../../models/common/crud-operation-model';
import RegionsModel from '../../models/regions/regions-model';
import EmployeeonboardingModel from '../../models/employeeonboarding/employeeonboarding-model';
import EmailModel from '../../models/emails/emails-model';
import { DMS } from '../../entities/employeeonboarding/dms';
import { documentChecklistTransaction } from '../../entities/employeeonboarding/document-checklist-transaction';
import { APILog } from "../../entities/apilog/apilog";
import { OnBoardingVendorEnvelopes } from "../../entities/vendoronboarding/vendoronboarding-envelopes";
import { OnBoardingVendorEnvelopeSigners } from "../../entities/vendoronboarding/vendoronboarding-envelope-signers";
import { PtProgressDetails } from "../../entities/employeeonboarding/pt-progress-details";
import { PtPlacementTracker } from "../../entities/employeeonboarding/pt-placementtracker";
// call all entities 
import { AppRefDataChild } from '../../entities/common/app-ref-data-child';
import responseFormat from '../../core/response-format';
import configContainer from '../../config/localhost';
import fs from 'fs';
import enums from '../../core/enums';
import CommonMethods from '../../core/common-methods';
import lodash from 'lodash';
import async from 'async';
import fieldsLength from '../../core/fieldsLength';
import logger from '../../core/logger';
import crypto from 'crypto';
import request from 'request';
import Q from 'q';
import path from 'path';
import _ from 'lodash';
/**
 *  -------Initialize global variabls-------------
 */
let vendoronboardingModel = new VendorOnboardingModel(),
    config = configContainer.loadConfig(),
    crudOperationModel = new CrudOperationModel(),
    employeeonboardingModel = new EmployeeonboardingModel(),
    commonMethods = new CommonMethods(),
    regionsModel = new RegionsModel();

    var hellosign = require('hellosign-sdk')({ key: config.helloSign.apiKey });
    var helloSignClientId = config.helloSign.clientId;
    const emailModel = new EmailModel();

class VendorOnboardingController {
    
    /**
     * Common methods for vendor Onboarding Save
     * @param {*}  : 
     */
    
    helloSignCallback(req, res, next) {
        res.status(200).send(req.body)
    }


    /**
     * Common methods for Verify vendor Onboarding
     * @param {*} employeeId : 
     */
    vendorOnboardingCheck(req, res, next) {
        let authAccessToken = req.headers.authorizationToken;
        let response = responseFormat.createResponseTemplate();
        let code = req.body.code;
        let self = this;
        let respData = [], promises = [];                                                            
        self.validateVendor(code, req, function (response) {           
            if ( response.statusCode == 200 ){
                if (response.responseFormat.code == 200){
                    if (response.responseFormat.content.dataList && response.responseFormat.content.dataList.length > 0){
                        let placementTrackerId = response.responseFormat.content.dataList[0].placementTrackerId;
                        let emailId = response.responseFormat.content.dataList[0].emailId;
                        let envelopeId = response.responseFormat.content.dataList[0].envelopeId;
                        let vendorName = response.responseFormat.content.dataList[0].vendorName;
                        if (placementTrackerId) {                            
                            promises.push(vendoronboardingModel.getVendorDetailsByPlacementTrackerId(placementTrackerId, envelopeId, authAccessToken));
                            Q.all(promises).spread(function (empDetails) {                       
                                respData.push({empDetails: empDetails});
                                respData[0].empDetails.firstName = vendorName;
                                respData[0].empDetails.trackerId = placementTrackerId;    
                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                res.status(200).json(response);
                            });
                        } else {
                            res.status(response.statusCode).json(response.responseFormat);
                        }
                    }
                    else{
                        res.status(response.statusCode).json(response.responseFormat);
                    }
                }else{
                    res.status(response.statusCode).json(response.responseFormat);
                }
            }else{
                res.status(response.statusCode).json(response.responseFormat);
            }            
        })
    }

    /**
    * Manage validate Vendor 
    * @param {*} validateVendor : Vendor which to be validate
    */

    validateVendor(code, req, next){
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };
        commonMethods.decrypt(code)
            .then(dec => {
                if (dec != false){
                    const vendorDetails = JSON.parse(dec);
                    
                    if(vendorDetails.email != undefined && vendorDetails.placementTrackerId != undefined){
                        if(vendorDetails.email != '' && vendorDetails.placementTrackerId != ''){                            
                            vendoronboardingModel.verifyOnboardingVendor(vendorDetails.placementTrackerId, vendorDetails.email)
                            .then(res => {                                
                                if (res.length) {                                   
                                    vendoronboardingModel.verifyOnboardingVendorStatus(vendorDetails.placementTrackerId)
                                    .then(result => {
                                        if (result) {
                                            if (result[0].EnvelopeStatus == 2181 || result[0].EnvelopeStatus == 2182){
                                                resp.statusCode = 200;
                                                resp.responseFormat =  responseFormat.getResponseMessageByCodes('', {
                                                    content:
                                                    {
                                                        dataList: [{ 
                                                            placementTrackerId: vendorDetails.placementTrackerId, 
                                                            emailId:vendorDetails.email,
                                                            envelopeId:result[0].OnBoarding_EnvelopeId,
                                                            vendorName:res[0].Vendor_Name,
                                                        }],
                                                        messageList: { success: 'true' }
                                                    }
                                                });
                                                next(resp);
                                            }else{
                                                resp.statusCode = 200;
                                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                                                next(resp);
                                            }
                                        }else{
                                            resp.statusCode = 200;
                                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                                            next(resp);
                                        }
                                    })
                                }else{
                                    resp.statusCode = 200;
                                    resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                                    next(resp);
                                }
                            })
                        }else{
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                            next(resp);
                        }
                    }else{
                        resp.statusCode = 200;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                        next(resp);
                    }
                }else{
                    resp.statusCode = 200;
                    resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                    next(resp);
                }
            }).catch(error => {
                resp.statusCode = 200;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:false'], { code: 417 });
                next(resp);
            })
    }

    /**
    * uploadAttachment
    * @param {*} 
    */

    uploadAttachment(req, res, next) {
        let employeeDetailsId = null;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        let docName = req.body.docName ? req.body.docName.trim() : '';
        let docId = req.body.docId || 0;
        let fileName = req.body.fileName ? req.body.fileName.trim() : '';
        let fileData = req.body.fileData;
        let expiryDate = req.body.expiryDate || null;
        let trackerId = req.body.trackerId;

        let docVars = enums.uploadType.ptDocs;
        let pjEmployeeId = null;
        let placementTrackerId = req.body.trackerId;
        let employeeTypeId = null;
        let companyMasterId = enums.compnayMaster.default;
        docVars = enums.uploadType.employeeDocs;
        let Vendor_Id = null;;
        let documentType = null;
        if (!docName || docName == '') {
            msgCode.push('docName')
        }
        if (!docId || docId == 0) {
            msgCode.push('docId')
        }
        if (!fileName || fileName == '') {
            msgCode.push('fileName')
        }
        if (!fileData || fileData == '') {
            msgCode.push('fileData')
        }
        if (docVars.allowedExt.indexOf(path.extname(fileName).substr(1)) < 0) {
            msgCode.push('fileName:allowedAttachments')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            async.series([
                function (done) {
                // create evelope                
                    vendoronboardingModel.getVendorDetailByPlacementTrackerId(placementTrackerId)
                        .then(rs => {                           
                            employeeDetailsId = rs[0].EmployeeDetails_Id;
                            if (employeeDetailsId == null){
                                vendoronboardingModel.getEmployeeDetailByPlacementTrackerId(placementTrackerId)
                                .then(rs => {
                                    employeeDetailsId = rs[0].FromEmployeeDetails_Id;                                   
                                    done();
                                }).catch(err => {
                                    done('Error in creating vendor details : ' + err);
                                })
                            }else{
                                done();
                            }
                            
                        }).catch(err => {
                            done('Error in creating vendor details : ' + err);
                        })
                },
                function (done) {
                // create evelope                
                    vendoronboardingModel.getVendorIdByPlacementTrackerId(placementTrackerId)
                        .then(rs => {                           
                            Vendor_Id = rs[0].Vendor_Id;
                            done();
                        }).catch(err => {
                            done('Error in creating vendor details : ' + err);
                        })
                },
                function (done) {
                // create evelope                
                    vendoronboardingModel.getDocumentTypeByDocId(docId)
                        .then(rs => {                           
                            documentType = rs[0].Document_Type;
                            done();
                        }).catch(err => {
                            done('Error in creating vendor details : ' + err);
                        })
                },
                function (done) {
                    //upload doc                    
                    commonMethods.fileUpload(fileData, fileName, docVars.docTypeId, pjEmployeeId, placementTrackerId, employeeDetailsId)
                        .then((docFileUpload) => {
                            if (docFileUpload.isSuccess) {
                                let docData = {
                                    employeeId: employeeDetailsId,
                                    documentModule: 1,
                                    empClientVendorId: employeeDetailsId,
                                    fileName: docFileUpload.fileName,
                                    documentName: docName,
                                    createdDate: new Date(),
                                    createdBy: employeeDetailsId,
                                    status: 1,
                                    dataInsertFrom: enums.dataInsertFrom.onboarding,
                                    placementTrackerId: placementTrackerId,
                                    CompanyMaster_Id: companyMasterId,
                                    vm_Vendor_Id:Vendor_Id,
                                    Document_Id: docId,
                                    DocumentType: documentType,
                                    BaseUrlTypeId: enums.baseUrlType.typeId
                                };

                                
                                crudOperationModel.saveModel(DMS, docData, { dmsId: 0 })
                                    .then((result) => {
                                        if (result) {
                                            let transData = {
                                                groupId: 1,  //for vendor on-boarding this will be always sub-contractor (1) not employee (3)
                                                userId: employeeDetailsId,
                                                documentId: docId,
                                                expiryDate: expiryDate,
                                                dmsDocId: result.dmsId,
                                                createdDate: new Date(),
                                                createdBy: employeeDetailsId,
                                                dataInsertFrom: enums.dataInsertFrom.onboarding,
                                                placementTrackerId: placementTrackerId,
                                                spName: ' ORM'
                                            }
                                            crudOperationModel.saveModel(documentChecklistTransaction, transData, { documentId: docId, placementTrackerId: placementTrackerId })
                                                .then((result1) => {
                                                    if (result1) {
                                                        done()
                                                    }
                                                    else {
                                                        done(' error saving document transaction info in database ')
                                                    }
                                                }).catch(err1 => {
                                                    done(err1)
                                                })
                                        }
                                        else {
                                            done(' error saving document info in database ')
                                        }
                                    }).catch(err => {
                                        done(err)
                                    })
                            }
                            else {
                                response = responseFormat.getResponseMessageByCodes(['fileName:' + docFileUpload.msgCode[0]], { code: 417 });
                                res.status(200).send(response)
                            }
                        }).catch(err => {
                            done(err)
                        })
                },
                function (done) {
                    //===================== add Utm params in DB =====================//
                    commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.empOnboardDocUploaded, placementTrackerId, employeeDetailsId, function (rs) { });
                    //================================================================//
                    done();
                }
            ], function (err, result) {
                if (err) {
                    let resp = commonMethods.catchError('vendoronboarding-controller/uploadAttachment empDetailId - ' + employeeDetailsId + ' final -', err);
                    response = responseFormat.getResponseMessageByCodes(['errorText:errorFileUpload'], { code: resp.code });
                    res.status(resp.code).json(response);
                }
                else {
                    response = responseFormat.getResponseMessageByCodes(['success:saved']);
                    res.status(200).json(response);
                }
            })

        }

    }

    /**
    * deleteAttachment
    * @param {*} 
    */
    deleteAttachment(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        let dmsId = req.body.dmsId || 0;


        if (!dmsId || dmsId == 0) {
            msgCode.push('dmsId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            crudOperationModel.deleteModel(DMS, { dmsId: dmsId })
                .then(rs => {
                    if (rs) {
                        crudOperationModel.deleteModel(documentChecklistTransaction, { dmsDocId: dmsId })
                            .then(rs1 => {
                                response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                res.status(200).json(response);
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['errorText:invalidOperation'], { code: 417 });
                        res.status(200).json(response);
                    }

                })
        }
    }

    /** 
    * createEnvelope
    * @param {*} 
    */

    initiateEnvelopeProcess(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let placementTrackerId = req.body.placementTrackerId || 0;
        let envelopeId = req.body.envelopeId || 0;
        let self = this;
        let msgCode = [];

        if (!placementTrackerId) {
            msgCode.push('placementTrackerId')
        }
        if (!envelopeId) {
            msgCode.push('envelopeId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            self.createVendorEnvelope(placementTrackerId, envelopeId, function (rs) {
                res.status(rs.statusCode).json(rs.responseFormat);
            })
        }

    }

    /** 
    * create Vendor Envelope
    * @param {*} 
    */
    createVendorEnvelope(placementTrackerId, envelopeId = null, next) {
        let response = responseFormat.createResponseTemplate();
        let envelopeData = {};
        let dbEnvelopeId = 0;
        let envelopeTypeId = 0;
        let companyMasterId = enums.compnayMaster.default;
        let signUrl = '';
        let respObj = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        async.series([

            function (done) {
                // create evelope
                vendoronboardingModel.createVendorEnvelope(placementTrackerId, envelopeId)
                    .then(rs => {
                        envelopeData = rs.helloSignData;
                        dbEnvelopeId = rs.dbEnvelopeId;
                        envelopeTypeId = rs.envelopeTypeId;
                        placementTrackerId = rs.placementTrackerId;
                        companyMasterId = rs.companyMasterId;
                        done();
                    }).catch(err => {                       
                        done('Error in creating envelope on hellosign : ' + err);
                    })
            },
            function (done) {
                // save envelope data for api log
                let inputObj = {
                    application: enums.appRefParentId.apiLog,
                    method: 'POST',
                    endPoint: 'save hellosign envelope data',
                    requestHeader: 'dbEnvelopeId - ' + dbEnvelopeId + ',placementTrackerID : ' + placementTrackerId,
                    inputBody: JSON.stringify(envelopeData),
                    fromIp: '1.0.0.0',
                    createdDate: new Date(),
                    CompanyMaster_Id: companyMasterId
                };
                crudOperationModel.saveModel(APILog, inputObj, { apiLogId: 0 })
                    .then(rs => {                        
                    }).catch(error => {
                        let resp = commonMethods.catchError('helloSign createEnvelop data log \n ', error);
                    })

                // save envelope id in db
                let envData = {
                    signingProviderEnvelopeId: envelopeData.signature_request_id,
                    envelopeStatus: enums.helloSign.envelopStatus.created,
                    signingProviderEnvelopeStatus: enums.helloSign.keyValueStatus.signature_request_created,
                    signingProviderEnvelopeFinalURL: envelopeData.final_copy_uri,
                    updatedOn: new Date()
                };               
                crudOperationModel.updateAll(OnBoardingVendorEnvelopes, envData, { onBoardingEnvelopeId: dbEnvelopeId })
                    .then(rs => {                        
                        done();
                    }).catch(err => {                        
                        done('Error in saving evelopeData in db : ', err)
                    })
            },
            function (done) {
                var processItems = function (x) {                   
                    let item = envelopeData.signatures[x];                    
                    let signersData = {
                        signingProviderEnvelopeId: envelopeData.signature_request_id,
                        envelopeSignerId: item.signature_id,
                        envelopeSignerStatus: item.status_code,
                        envelopeSignerSignedAt: item.signed_at,
                        updatedBy: envelopeData.createdBy,
                        updatedOn: new Date()
                    }

                    crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopeSigners, { envelopeSignerEmail: item.signer_email_address.trim(), onBoardingEnvelopeId: dbEnvelopeId, envelopeSignerName: item.signer_name.trim() })
                        .then(getEnvDetail => {
                            if (getEnvDetail) {
                                crudOperationModel.updateAll(OnBoardingVendorEnvelopeSigners, signersData, { envelopeSignerEmail: item.signer_email_address.trim(), onBoardingEnvelopeId: dbEnvelopeId, envelopeSignerName: item.signer_name.trim() })
                                    .then(rs => {
                                        if (!rs[0]) {
                                            commonMethods.catchError('Save Signers error : ', " DbEnvlopeId : " + dbEnvelopeId + " || " + JSON.stringify(item))
                                        }
                                        else {
                                            //========for reporting purpose
                                            // let data = { whereCondition: {envelopeSignerEmail : item.signer_email_address.trim(), onBoardingEnvelopeId : dbEnvelopeId, envelopeSignerName : item.signer_name.trim()},
                                            //                  signersData : signersData};
                                            // commonMethods.catchErrorHellosign('vendoronboarding-controller/createEnvelope 1 - : ', JSON.stringify(data)); 
                                        }
                                    })
                            }
                            else {
                                let data = {
                                    whereCondition: { envelopeSignerEmail: item.signer_email_address.trim(), onBoardingEnvelopeId: dbEnvelopeId, envelopeSignerName: item.signer_name.trim() },
                                    signersData: signersData
                                };
                                commonMethods.catchErrorHellosign('vendoronboarding-controller/createEnvelope 2- : ', JSON.stringify(data));
                            }

                        });

                    if (envelopeData.signatures.length == (x + 1)) {
                        done();
                    } else {
                        processItems(x + 1);
                    }
                };

                processItems(0);
            },
            function (done) {
                // update status on placement tracker progress
                let pdata = {};
                if (envelopeTypeId == enums.helloSign.envelopeType.vendor) {
                    pdata['VendorStatus'] = enums.helloSign.vendorStatus.inprocess;
                }
                crudOperationModel.updateAll(PtProgressDetails, pdata, { placementTrackerId: placementTrackerId })
                    .then(rs => {
                        done();
                    }).catch(err => {
                        done('Error on upding placement tracker progress' + err)
                    })
            },
            function (done) {
                // get Sign Url For IFRAME
                vendoronboardingModel.getSignUrl(envelopeData.signatures[0].signature_id)
                    .then(rs => {
                        signUrl = rs + '&client_id=' + config.helloSign.clientId;
                        done()
                    })
                    .catch(err => {
                        done('error occurrd on fetch sign Url : ', err)
                    })
            }
        ], function (err, result) {
            if (err) {
                let response = commonMethods.catchError('vendoronboarding-controller/createEnvelopeByTemplateId - : ', err);
                respObj.statusCode = response.code;
                respObj.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(respObj);
            }
            else {
                respObj.statusCode = 200;
                respObj.responseFormat = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ signUrl: signUrl }] } });
                next(respObj);
            }
        })
    }

     /** 
    * call SignUrl With Envelope
    * @param {*} 
    */
    callSignUrlWithEnvelope(req, res, next) {
        // console.log("===<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>===");
        let response = responseFormat.createResponseTemplate();
        let envelopeId = req.params.envelopeId;
        let self = this;
        let msgCode = [];

        /*if (!placementTrackerId) {
            msgCode.push('placementTrackerId')
        }*/

        if (!envelopeId) {
            msgCode.push('envelopeId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopes, { onBoardingEnvelopeId: envelopeId })
                .then(pt => {                   
                    let placementTrackerId = pt.placementTrackerId;
                    if (pt) {

                        if (pt.envelopeStatus == enums.helloSign.envelopStatus.draft) {
                            self.createVendorEnvelope(placementTrackerId, envelopeId, function (rs) {
                                res.status(rs.statusCode).json(rs.responseFormat);
                            });
                        }
                        else if (pt.envelopeStatus == enums.helloSign.envelopStatus.created) {
                            self.signinUrlWithEnvelope(envelopeId, function (rs) {
                                //console.log(rs)
                                if (rs.envelopeSignerId) {
                                    vendoronboardingModel.getSignUrl(rs.envelopeSignerId)
                                        .then(rssigner => {
                                            let signUrl = '';
                                            if (rssigner == 'alreadySigned') {
                                                signUrl = rssigner;
                                            }
                                            else {
                                                signUrl = rssigner + '&client_id=' + config.helloSign.clientId;
                                            }
                                            response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ signUrl: signUrl }] } });
                                            res.status(200).json(response);

                                        }).catch(err => {
                                            let response = commonMethods.catchError('vendoronboarding-controller/callSignUrlWithEnvelope - : ', err);
                                            response = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                                            res.status(200).json(response);
                                        })
                                } else {
                                    response = responseFormat.getResponseMessageByCodes(['errorText:noActiveEnvelope'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            });
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:completedEnvelope'], { code: 417 });
                            res.status(200).json(response);
                        }
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['errorText:envelopeId'], { code: 417 })
                        res.status(200).json(response);
                    }
                });
        }
    }

    /** 
    * SignUrl With Envelope
    * @param {*} 
    */
    signinUrlWithEnvelope(envlopeId, next) {
        crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopeSigners, { onBoardingEnvelopeId: envlopeId, isVendor: 1, envelopeSignerSignedAt: null })
            .then(pt => {
                if (pt) {
                    if (pt.envelopeSignerId) {
                        next({ envelopeSignerId: pt.envelopeSignerId })
                    } else {
                        next({ envelopeSignerId: '' })
                    }
                }
                else {
                    next({ envelopeSignerId: '' })
                }
            })
            .catch(function (err) {
                let response = commonMethods.catchError('vendoronboarding-controller/signinUrlWithEnvelope - : ', err);
                next({ envelopeSignerId: '' });
            });;
    }

    /** 
    * get Envelope Files
    * @param {*} 
    */

    getEnvelopeFiles(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let envelopeId = req.body.envelopeId || 0;
        let msgCode = [];

        if (!envelopeId || envelopeId < 0) {
            msgCode.push('envelopeId')
        }
        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopes, { onBoardingEnvelopeId: envelopeId })
                .then(rs => {
                    if (rs) {
                        vendoronboardingModel.getEnvelopeFiles(rs.signingProviderEnvelopeId)
                            .then(rs1 => {
                                if (rs1 && rs1.success) {
                                    let filePath = config.apiHostUrl + '/Documents/' + rs1.fileName;
                                    response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ fileUrl: filePath }] } });
                                    res.status(200).json(response);
                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['errorText:fileNoPrepared'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            }).catch(err => {
                                let resp = commonMethods.catchError('vendoronboarding-controller/getEnvelopeFiles - ', err);
                                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['envelopeId'], { code: 417 });
                        res.status(200).json(response);
                    }

                })
        }
    }

    downloadEnvelopeFilesByEnvelopeId(req, res) {
        let response = responseFormat.createResponseTemplate();
        let envelopeId = req.body.envelopeId || 0;
        let self = this;
        let msgCode = [];

        if (!envelopeId) {
            msgCode.push('envelopeId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopes, { onBoardingEnvelopeId: envelopeId })
                .then(env => {
                    if (env) {
                        let url = 'https://' + config.helloSign.apiKey + ':@api.hellosign.com' + env.signingProviderEnvelopeFinalURL.replace(/final_copy/g, "files") + '?file_type=zip';

                        response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ fileUrl: url }] } });
                        res.status(200).json(response);
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['envelopeId'], { code: 417 });
                        res.status(200).json(response);
                    }
                })
        }
    }

    createZipFile(req, res, next) {

        hellosign.signatureRequest.download('931051da490b62cf59e100e74f080915cbd5a3d1', { file_type: 'zip' }, function (err, response) {
            var fs = require('fs');
            var file = fs.createWriteStream(__dirname + '/../../../Upload/testSigned.zip');
            response.pipe(file);

            file.on('finish', function () {
                res.status(200).send('complete')
                file.close();
            });
        });
    }

    createCodeForSigner(req, res) {
        let response = responseFormat.createResponseTemplate();
        let type = req.body.type || '';
        let signerId = req.body.signerId || 0;
        let self = this;
        let msgCode = [];

        let typeArr = ['SIGNERURL']

        if (!type) {
            msgCode.push('type')
        }
        else if (typeArr.indexOf(type) < 0) {
            msgCode.push('type')
        }
        if (!signerId) {
            msgCode.push('signerId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            let encKey = commonMethods.encrypt(type + '||' + signerId + '||' + new Date().getTime());
            response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ code: encKey }] } });
            res.status(200).json(response);
        }

    }

    getAllTemplates(req, res, next) {
        let response = responseFormat.createResponseTemplate();

        let page = req.body.page || 1;
        let pageSize = req.body.pageSize || 100;
        let title = req.body.title || '';

        vendoronboardingModel.getAllTemplatesFromHelloSign(page, pageSize, title)
            .then(rs => {
                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: rs } });
                res.status(200).json(response);
            }).catch(err => {
                commonMethods.catchError('vendoronboarding-controller/getAllTemplates - ', err);
                response = responseFormat.getResponseMessageByCodes(['errorText:helloSignError'], { code: 417 });
                res.status(200).json(response);
            })

    }


    getSignerOrderByTemplates(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let msgCode = []

        let templateArray = req.body.templates || [];

        if (!templateArray.length) {
            msgCode.push('templates')
        }

        if (msgCode.length) {

            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            vendoronboardingModel.getSignerOrderByTemplates(templateArray)
                .then(rs => {
                    response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: rs } });
                    res.status(200).json(response);
                }).catch(err => {
                    commonMethods.catchError('employeeonboarding-controller/getAllTemplates - ', err);
                    response = responseFormat.getResponseMessageByCodes(['errorText:helloSignError'], { code: 417 });
                    res.status(200).json(response);
                })
        }
    }

    getFilesUrlByTemplateId(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let templateId = req.body.templateId || 0;
        let self = this;
        let msgCode = [];


        if (!templateId) {
            msgCode.push('errorText:templateId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            hellosign.template.files(templateId, { get_url: 'true' }, function (err, data) {
                if (err) {
                    response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: 417 })
                    res.status(200).json(response);
                }
                else {
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: data.file_url } });
                    res.status(200).json(response);
                }
            })
                .catch(function (err) {
                    response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: 417 })
                    res.status(200).json(response);
                });
        }
    }

    getDocumentByTemplateId(req, res, next) {
        let response = responseFormat.createResponseTemplate();

        let templateId = req.params.templateId;
        vendoronboardingModel.getDocumentByTemplateId(templateId)
            .then(rs => {
                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: rs } });
                res.status(200).json(response);

            }).catch(err => {
                commonMethods.catchError('vendoronboarding-controller/getHsDocumentUrlByTemplateId - ', err);
                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: 417 });
                res.status(200).json(response);
            })
    }

    getHsDocumentUrlByTemplateId(req, res, next) {
        let response = responseFormat.createResponseTemplate();

        let templateId = req.params.templateId;
        vendoronboardingModel.getHsDocumentUrlByTemplateId(templateId)
            .then(rs => {
                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ fileUrl: rs.file_url }] } });
                res.status(200).json(response);
            }).catch(err => {
                commonMethods.catchError('employeeonboarding-controller/getHsDocumentUrlByTemplateId - ', err);
                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: 417 });
                res.status(200).json(response);
            })
    }

    getSignerByTemplateIdsOther(req, res) {

        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        let templateIds = req.body.templateIds || [];
        let title = req.body.title || '';

        // let templateIds = ['464b1840b31acbb4ec3882ebd939f6e1aac29512','5124ad6f1726888f228224b1f19dfea723ec595f','438c4a3e25776ea57dad4a0c24f1309478854d1a'];

        if (!templateIds.length || !Array.isArray(templateIds)) {
            msgCode.push('templateIds');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            let missingTemplates = [];

            hellosign.template.list({ page: 1, page_size: 100, query: title })
                .then(function (resp) {

                    try {

                        // totalTemplates = resp.list_info.num_result;

                        let selectedTemp = resp.templates.filter(item => {
                            return templateIds.indexOf(item.template_id) > -1
                        });

                        let signerRoles = selectedTemp.map(item => {
                            return item.signer_roles.map(i => { return i.name });;
                        })

                        missingTemplates = selectedTemp.filter(item => {
                            return templateIds.indexOf(item.template_id) > -1
                        }).map(i => { return i.template_id })


                        if (selectedTemp.length < templateIds.length) {
                            missingTemplates = _.difference(templateIds, missingTemplates);

                            let singers = _.uniq(_.flattenDeep(signerRoles));
                            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [{ missingTemplates: missingTemplates, signers: singers }] } });
                            res.status(200).json(response);

                        }
                        else {
                            let singers = _.uniq(_.flattenDeep(signerRoles));
                            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [{ templates: sTemps, signers: singers }] } });
                            res.status(200).json(response);
                        }

                    }
                    catch (e) {
                        console.log(e)
                    }
                }).then(selectedTemp => {

                })

        }
    }

    getSignUrlForOtherSigner(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let code = req.body.code;
        let msgCode = [];

        if (!code || code == '') {
            msgCode.push('errorText:code')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            commonMethods.decrypt(code)
                .then(dec => {
                    if (dec) {
                        let userData = dec.split('||');
                        if (userData[0] == 'SIGNERURL') {
                            let signerId = userData[1];
                            vendoronboardingModel.getSignerInfoBySignerId(signerId)
                                .then(signer => {
                                    if (signer.length) {
                                        vendoronboardingModel.getSignUrl(signer[0].signerSignatureId)
                                            .then(rs => {
                                                if (rs == 'alreadySigned') {
                                                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [{ signUrl: 'alreadySigned' }] } });
                                                    res.status(200).json(response);
                                                } else {
                                                    let signUrl = rs + '&client_id=' + config.helloSign.clientId;
                                                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [{ signUrl: signUrl }] } });
                                                    res.status(200).json(response);
                                                }

                                            }).catch(err => {
                                                let resp = commonMethods.catchError('vendoronboarding-controller/getSignUrlForOtherSigner : ', err);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })
                                    }
                                    else {
                                        // let resp = commonMethods.catchError('vendoronboarding-controller/getSignUrlForOtherSigner - ', err);
                                        response = responseFormat.getResponseMessageByCodes(['errorText:signerId'], { code: resp.code });
                                        res.status(resp.code).json(response);
                                    }

                                })
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:invalidCode'], { code: 417 });
                            res.status(200).json(response);
                        }
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['errorText:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }
                }).catch(err => {
                    response = responseFormat.getResponseMessageByCodes(['errorText:invalidCode'], { code: 417 });
                    res.status(200).json(response);
                })
        }
    }

    getSignerByTemplateIds(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        let templateIds = req.body.templateIds || [];

        // let templateIds = ['464b1840b31acbb4ec3882ebd939f6e1aac29512','5124ad6f1726888f228224b1f19dfea723ec595f','438c4a3e25776ea57dad4a0c24f1309478854d1a'];

        if (!templateIds.length || !Array.isArray(templateIds)) {
            msgCode.push('templateIds');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            let selectedTemp = [];
            let signers = [];
            let missingTemplates = [];

            async.series([
                function (done) {
                    // get all Template info
                    async.mapSeries(templateIds, function (item, cb) {
                        vendoronboardingModel.getTemplateDetails(item)
                            .then(rs => {
                                selectedTemp.push({ templateId: rs.template.template_id, name: rs.template.title });
                                signers.push(rs.template.signer_roles.map(i => i.name))
                                cb()
                            }).catch(err => {
                                missingTemplates.push(item);
                                cb()
                                // done(err)
                            })
                    }, function (err) {
                        if (err) {
                            done('template not found : ', err)
                        }
                        else
                            done()
                    })
                },
                function (done) {
                    let signerRoles = _.uniq(_.flatten(signers));
                    let signerRoles1 = signerRoles.slice();
                    let vetterIndex = signerRoles.indexOf("Vetter") > -1 ? signerRoles.indexOf("Vetter") : signerRoles.indexOf("vetter");
                    if (vetterIndex > -1) {
                        signerRoles.splice(vetterIndex, 1);
                        signerRoles.splice(0, 0, signerRoles1[vetterIndex])
                    }
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [{ missingTemplates: missingTemplates, signers: signerRoles }] } });
                    res.status(200).json(response);
                }
            ], function (err, result) {
                if (err) {
                    let resp = commonMethods.catchError('vendoronboarding-controller/getSignerByTemplateIds final - ', err);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                }
            })

        }
    }

    saveEvents(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let eventBody = req.body;
        // let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        let self = this;
        let companyMasterId = 0;        
        if (eventBody && eventBody.event) {
            if (typeof eventBody.event == 'string' && eventBody.event == 'signature_request_signed') {
                let data = {
                    envelopeSignerStatus: 'signature_request_signed',
                    envelopeSignerSignedAt: new Date(),
                    updatedOn: new Date()
                };
                
                vendoronboardingModel.signerEvent(data, eventBody.signature_id)
                    .then(rs1 => {                       
                        if (rs1.length){
                            vendoronboardingModel.getNextSigner(rs1[0].envelopeId)
                            .then(rs => {
                                if (rs.length && rs[0].signerSignatureId) {
                                    vendoronboardingModel.getEnvelopeDetails(rs[0].signerSignatureId)
                                        .then(envDtl => {
                                        if (envDtl.length) {
                                            if (!rs[0].isVendor) {
                                                // send mail to other signer e.g. manager 
                                                let encKey = commonMethods.encrypt('SIGNERURL||' + rs[0].signerId + '||' + new Date().getTime());
                                                // let signerPage = '/vendor-onboarding/managerurl/'+encKey;
                                                let signerPage = encKey;
                                                let mailData = [
                                                    { name: "ManagerFullName", value: rs[0].signerName.trim() },
                                                    { name: "VendorName", value: envDtl[0].Vendor_Name.trim() },
                                                    { name: "JobTitle", value: envDtl[0].jobTitle },
                                                    { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                    { name: "On-boardingPage", value: signerPage }
                                                ];

                                                let options = {};
                                                if (envDtl[0].OnboardingRepEmail){
                                                    options = {
                                                        mailTemplateCode: enums.emailConfig.codes.helloSign.nextSignerEmail,
                                                        toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                        ccMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName.trim() }],
                                                        placeHolders: mailData,
                                                        replyToEmailid: envDtl[0].OnboardingRepEmail,
                                                        companyMasterId: 1, // for all type of company
                                                        senderId: rs[0].signerEmployeeDetailsId || 0
                                                    };
                                                }else{
                                                    options = {
                                                        mailTemplateCode: enums.emailConfig.codes.helloSign.nextSignerEmail,
                                                        toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                        ccMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName.trim() }],
                                                        placeHolders: mailData,
                                                        replyToEmailid: envDtl[0].hrEmail,
                                                        companyMasterId: 1, // for all type of company
                                                        senderId: rs[0].signerEmployeeDetailsId || 0
                                                    };
                                                }                                                

                                                emailModel.mail(options, 'vendoronboarding-controller/sendSignatureRequestMail- managermail ')
                                                    .then(ml => {
                                                    })                                                                                                
                                            }
                                            else if (rs[0].isVendor) {
                                                // send mail to employee
                                                vendoronboardingModel.getEnvDetails(envDtl[0].placementTrackerId)
                                                    .then(rec => {                                                        
                                                        if (rec.length) {

                                                            let codeKey = {
                                                                placementTrackerId:envDtl[0].placementTrackerId,
                                                                email:rs[0].signerEmail
                                                            }                                                            
                                                            let encKey = commonMethods.encrypt(JSON.stringify(codeKey));
                                                            let mailData = [];
                                                            if (rec[0].onboardingSignature){
                                                                mailData = [
                                                                    { name: "RecipientFirstName", value: rs1[0].signerName.trim() },
                                                                    { name: "JobTitle", value: envDtl[0].jobTitle },
                                                                    { name: "activatetoken", value: encKey },
                                                                    { name: "SenderSignature", value: rec[0].onboardingSignature },
                                                                    { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                                    { name: "CandidateName", value: envDtl[0].candidateName.trim() }
                                                                ];
                                                            }else{
                                                                mailData = [
                                                                    { name: "RecipientFirstName", value: rs1[0].signerName.trim() },
                                                                    { name: "JobTitle", value: envDtl[0].jobTitle },
                                                                    { name: "activatetoken", value: encKey },
                                                                    { name: "SenderSignature", value: rec[0].hrSignature },
                                                                    { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                                    { name: "CandidateName", value: envDtl[0].candidateName.trim() }
                                                                ];
                                                            }
                                                            let options = {
                                                                mailTemplateCode: enums.emailConfig.codes.helloSign.vendorEmail,
                                                                toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                                placeHolders: mailData,
                                                                ccMail: [{ mailId: rec[0].RecEmail_ID || '', displayName: '' }],
                                                                companyMasterId: 1, // for all type of company
                                                                senderId: rs[0].employeeDetailsId || 0
                                                            };

                                                            emailModel.mail(options, 'vendoronboarding-controller/saveEvents- signature_request_signed employee ')
                                                                .then(ml => {                                                           
                                                                })
                                                        }
                                                    })

                                            }
                                        }
                                    })
                                }
                            })
                        }
                        res.status(200).send(eventBody);
                    }).catch(err => {
                        commonMethods.catchError('vendoronboarding-controller/saveEvents signature_request_signed immidiate : ', err);
                    })

            }
            else if (typeof eventBody.event == 'string' && eventBody.event == 'signature_request_canceled') {
                // do nothing on this 
                res.status(200).send(eventBody);
            }
            else if (typeof eventBody.event == 'object' && eventBody.event.event_type == 'signature_request_sent') {
                // do nothing
                res.status(200).send(eventBody);
            }
            else if (typeof eventBody.event == 'object' && eventBody.event.event_type == 'signature_request_signed') {
                let currentSignatereId = eventBody.event.event_metadata.related_signature_id;

                let allSigners = eventBody.signature_request.signatures;

                let currentSigner = allSigners.filter(item => {
                    return item.signature_id == currentSignatereId;
                })                
                
                let data = {
                    envelopeSignerStatus: 'signature_request_signed',
                    envelopeSignerSignedAt: new Date(currentSigner[0].signed_at * 1000),
                    updatedOn: new Date()
                };                
                vendoronboardingModel.signerEvent(data, currentSignatereId)
                    .then(rs1 => {                       
                        if (rs1.length){
                            vendoronboardingModel.getNextSigner(rs1[0].envelopeId)
                            .then(rs => {
                                if (rs.length && rs[0].signerSignatureId) {
                                    vendoronboardingModel.getEnvelopeDetails(rs[0].signerSignatureId)
                                        .then(envDtl => {
                                        if (envDtl.length) {
                                            if (!rs[0].isVendor) {
                                                // send mail to other signer e.g. manager 
                                                let encKey = commonMethods.encrypt('SIGNERURL||' + rs[0].signerId + '||' + new Date().getTime());
                                                // let signerPage = '/vendor-onboarding/managerurl/'+encKey;
                                                let signerPage = encKey;
                                                let mailData = [
                                                    { name: "ManagerFullName", value: rs[0].signerName.trim() },
                                                    { name: "VendorName", value: envDtl[0].Vendor_Name.trim() },
                                                    { name: "JobTitle", value: envDtl[0].jobTitle },
                                                    { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                    { name: "On-boardingPage", value: signerPage }
                                                ];

                                                let options = {};
                                                if (envDtl[0].OnboardingRepEmail){
                                                    options = {
                                                        mailTemplateCode: enums.emailConfig.codes.helloSign.nextSignerEmail,
                                                        toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                        ccMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName.trim() }],
                                                        placeHolders: mailData,
                                                        replyToEmailid: envDtl[0].OnboardingRepEmail,
                                                        companyMasterId: 1,// for all type of company
                                                        senderId: rs[0].signerEmployeeDetailsId || 0
                                                    };
                                                }else{
                                                    options = {
                                                        mailTemplateCode: enums.emailConfig.codes.helloSign.nextSignerEmail,
                                                        toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                        ccMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName.trim() }],
                                                        placeHolders: mailData,
                                                        replyToEmailid: envDtl[0].hrEmail,
                                                        companyMasterId: 1,// for all type of company
                                                        senderId: rs[0].signerEmployeeDetailsId || 0
                                                    };
                                                } 
                                                

                                                emailModel.mail(options, 'vendoronboarding-controller/sendSignatureRequestMail- managermail ')
                                                    .then(ml => {
                                                    })                                                                                                
                                            }
                                            else if (rs[0].isVendor) {
                                                // send mail to employee
                                                vendoronboardingModel.getEnvDetails(envDtl[0].placementTrackerId)
                                                    .then(rec => {                                                        
                                                        if (rec.length) {

                                                            let codeKey = {
                                                                placementTrackerId:envDtl[0].placementTrackerId,
                                                                email:rs[0].signerEmail
                                                            }                                                            
                                                            let encKey = commonMethods.encrypt(JSON.stringify(codeKey));
                                                            let mailData = [];
                                                            if (rec[0].onboardingSignature){
                                                                mailData = [
                                                                    { name: "RecipientFirstName", value: rs1[0].signerName.trim() },
                                                                    { name: "JobTitle", value: envDtl[0].jobTitle },
                                                                    { name: "activatetoken", value: encKey },
                                                                    { name: "SenderSignature", value: rec[0].onboardingSignature },
                                                                    { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                                    { name: "CandidateName", value: envDtl[0].candidateName.trim() }
                                                                ]; 
                                                            }else{
                                                                mailData = [
                                                                    { name: "RecipientFirstName", value: rs1[0].signerName.trim() },
                                                                    { name: "JobTitle", value: envDtl[0].jobTitle },
                                                                    { name: "activatetoken", value: encKey },
                                                                    { name: "SenderSignature", value: rec[0].hrSignature },
                                                                    { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                                    { name: "CandidateName", value: envDtl[0].candidateName.trim() }
                                                                ]; 
                                                            }                                                       

                                                            let options = {
                                                                mailTemplateCode: enums.emailConfig.codes.helloSign.vendorEmail,
                                                                toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                                placeHolders: mailData,
                                                                ccMail: [{ mailId: rec[0].RecEmail_ID || '', displayName: '' }],
                                                                companyMasterId: 1, // for all type of company
                                                                senderId: rs[0].employeeDetailsId || 0
                                                            };

                                                            emailModel.mail(options, 'vendoronboarding-controller/saveEvents- signature_request_signed employee ')
                                                                .then(ml => {                                                           
                                                                })
                                                        }
                                                    })

                                            }
                                        }
                                    })
                                }
                            })
                        }
                        res.status(200).send(eventBody);
                    }).catch(err => {
                        commonMethods.catchError('vendoronboarding-controller/saveEvents signature_request_signed immidiate : ', err);
                    })

            }
            else if (typeof eventBody.event == 'object' && eventBody.event.event_type == 'signature_request_viewed') {
                let currentSignatereId = eventBody.event.event_metadata.related_signature_id;

                let allSigners = eventBody.signature_request.signatures;

                let currentSigner = allSigners.filter(item => {
                    return item.signature_id == currentSignatereId;
                })


                let data = {
                    envelopeSignerStatus: 'signature_request_viewed',
                    envelopeSignerLastViewedAt: new Date(currentSigner[0].last_viewed_at * 1000),
                    updatedOn: new Date()
                };
                vendoronboardingModel.signerEvent(data, currentSignatereId)
                    .then(rs => {
                        res.status(200).send(eventBody);
                    })

            }
            else if (typeof eventBody.event == 'object' && eventBody.event.event_type == 'signature_request_all_signed') {
                let data = {
                    signingProviderEnvelopeStatus: enums.helloSign.keyValueStatus.signature_request_all_signed,
                    updatedOn: new Date()
                }
                vendoronboardingModel.envelopeEvent(data, eventBody.signature_request_id)
                    .then(rs => {
                        res.status(200).send(eventBody);
                    })

            }
            else if (typeof eventBody.event == 'object' && eventBody.event.event_type == 'signature_request_downloadable') {
                let hellosignEnvelopeData = eventBody.signature_request;
                
                if (hellosignEnvelopeData.is_complete) {
                    let data = {
                        signingProviderEnvelopeStatus: enums.helloSign.keyValueStatus.signature_request_downloadable,
                        updatedOn: new Date()
                    }
                    vendoronboardingModel.envelopeEvent(data, hellosignEnvelopeData.signature_request_id)
                        .then(rs => {
                            self.envelopeCompletion(hellosignEnvelopeData.signature_request_id, function (resp) {
                                
                                if (!resp.isSuccess) {
                                    // error mail to hr
                                    self.sendEnvelopeCompletionMail(resp.data.placementTrackerId, enums.emailConfig.codes.helloSign.envlopeCompletionFail, 'failed')
                                }
                                else {
                                    //call webhook url and send mail to hrsupport

                                    setTimeout(function () {
                                        let options = {
                                            method: 'POST',
                                            url: config.thirdPartyApiUrl + config.hsDocCreatedEndPoint,
                                            body: resp.data,
                                            timeout: 30000,
                                            json: true
                                        };                                     

                                    request(options, function (error, response, body) {                                       
                                        if (body.status == 200) {
                                            self.sendEnvelopeCompletionMail(resp.data.placementTrackerId, enums.emailConfig.codes.helloSign.vendorEnvlopeCompleted, 'success')
                                        }
                                    })
                                    }, 10000);
                                }

                            })

                            res.status(200).send(eventBody);
                        })
                }
                else {
                    res.status(200).send(eventBody);
                }
            }
            else if (typeof eventBody.event == 'object' && (eventBody.event.event_type == 'signature_request_invalid' || eventBody.event.event_type == 'sign_url_invalid')) {
                commonMethods.catchError('vendoronboarding-controller/saveEvents - ', eventBody.event.event_type);
                res.status(200).send(eventBody);
            }
            else if (typeof eventBody.event == 'string' && eventBody.event == 'error') {
                commonMethods.catchError('vendoronboarding-controller/saveEvents [Error event] - ', eventBody.description);
                res.status(200).send(eventBody);
            }
            else {
                commonMethods.catchError('vendoronboarding-controller/saveEvents [UNHANDLED EVENT TRACK] - ', eventBody);
                res.status(200).send(eventBody);
            }
        }

    }


    sendEnvelopeCompletionMail(placementTrackerId, templateId, caller) {
        vendoronboardingModel.getCompletedEnvelope(placementTrackerId)
            .then(envDtl => {
                if (envDtl.length) {
                    let fileUrl = 'https://' + config.helloSign.apiKey + ':@api.hellosign.com' + (envDtl[0].fileUrl.replace(/final_copy/g, "files")) + '?file_type=zip';

                    let zipFileUrl = '';

                    if (envDtl[0].employeeDetailsId) {
                       /* zipFileUrl = envDtl[0].zipFilePath ? config.portalHostUrl + config.documentBasePath + enums.uploadType.employeeDocs.path + '/' + envDtl[0].employeeDetailsId + '/' + envDtl[0].zipFilePath : '';*/
                        zipFileUrl = envDtl[0].zipFilePath ? config.documentHostUrl + config.documentBasePath + enums.uploadType.employeeDocs.path + '/' + envDtl[0].employeeDetailsId + '/' + envDtl[0].zipFilePath : '';
                    }
                    else {
                        zipFileUrl = '';
                    }

                    let mailData = [
                        { name: "VendorName", value: envDtl[0].Vendor_Name.trim() },                        
                        { name: "DOCUMENTURL", value: fileUrl },

                    ];

                    let options = {};
                    if (envDtl[0].OnboardingRepEmail){
                        options = {
                            mailTemplateCode: templateId,
                            toMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName }],
                            ccMail: [
                                { mailId: envDtl[0].salesEmail, displayName: envDtl[0].salesFirstName.trim() },
                                { mailId: envDtl[0].recEmail, displayName: envDtl[0].recFirstName.trim() },
                                { mailId: envDtl[0].VendorEmail, displayName: envDtl[0].Vendor_Name.trim() },
                            ],
                            placeHolders: mailData,
                            companyMasterId: 1, // for all type of company
                            senderId: envDtl[0].employeeDetailsId || 0
                        };
                    }else{
                        options = {
                            mailTemplateCode: templateId,
                            toMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName }],
                            ccMail: [
                                { mailId: envDtl[0].salesEmail, displayName: envDtl[0].salesFirstName.trim() },
                                { mailId: envDtl[0].recEmail, displayName: envDtl[0].recFirstName.trim() },
                                { mailId: envDtl[0].VendorEmail, displayName: envDtl[0].Vendor_Name.trim() },
                            ],
                            placeHolders: mailData,
                            companyMasterId: 1, // for all type of company
                            senderId: envDtl[0].employeeDetailsId || 0
                        };
                    }

                    emailModel.mail(options, 'employeeonboarding-model/createEnvelope ' + caller)
                        .then(rs => { })
                }
            })
    }


    envelopeCompletion(signatureRequestId, next) {        
        let allDocs = [];
        let envelopeId = 0;
        let envelopeType = 0;
        let placementTrackerId = 0;
        let Vendor_Id = null;;
        let employeeDetailsId = null;
        let response = {
            "eventType": "downloadDocURL",
            "docURL": "",
            "documents": [],
            "isVendor": 0,
            "pjEmployeeId": "",
            "employeeDetailsId": 0,
            "placementTrackerId": 0,
            "clientCode": "",
            "envelopeId": 0,
            "envelopeType": ""
        }
        async.series([
            function (done) {                
                crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopes, { signingProviderEnvelopeId: signatureRequestId })
                    .then(temps => {                   
                        envelopeId = temps.onBoardingEnvelopeId;
                        envelopeType = temps.envelopeType;
                        placementTrackerId = temps.placementTrackerId;
                        let templates = temps.signingProvidersTemplateIds.trim().replace(/(^,)|(,$)/g, "").split(',');
                        async.mapSeries(templates, function (item, cb) {
                            let tempDocs = [];
                            vendoronboardingModel.getDocumentByTemplateId(item)
                                .then(docs => {                                   
                                    let i = 0;
                                    docs.forEach(d => {
                                        tempDocs.push({ order: d.index, Name: d.name }) //
                                    })
                                    Array.prototype.push.apply(allDocs, _.orderBy(tempDocs, ['order'], ['asc']));
                                    cb();
                                }).catch(err => {
                                    done('Template error : ' + err.message)
                                })
                        }, function (err) {
                            if (err) {
                                done('error occurrd on fetching envelope documents : ' + err)
                            }
                            else
                                done()
                        })
                    })
            },
            function (done) {
            // create evelope                
                vendoronboardingModel.getVendorDetailByPlacementTrackerId(placementTrackerId)
                    .then(rs => {                           
                        employeeDetailsId = rs[0].EmployeeDetails_Id;
                        if (employeeDetailsId == null){
                            vendoronboardingModel.getEmployeeDetailByPlacementTrackerId(placementTrackerId)
                            .then(rs => {
                                employeeDetailsId = rs[0].FromEmployeeDetails_Id;                                   
                                done();
                            }).catch(err => {
                                done('Error in creating vendor details : ' + err);
                            })
                        }else{
                            done();
                        }
                    }).catch(err => {
                        done('Error in creating vendor details : ' + err);
                    })
            },
            function (done) {
            // create evelope                
                vendoronboardingModel.getVendorIdByPlacementTrackerId(placementTrackerId)
                    .then(rs => {                           
                        Vendor_Id = rs[0].Vendor_Id;
                        done();
                    }).catch(err => {
                        done('Error in creating vendor details : ' + err);
                    })
            },
            function (done) {                
                crudOperationModel.findModelByCondition(OnBoardingVendorEnvelopeSigners, { onBoardingEnvelopeId: envelopeId, isVendor: 1 })
                    .then(rs => {
                        // crudOperationModel.findModelByCondition(EmployeeDetails, {employeeDetailsId : rs.employeeDetailsId})
                        crudOperationModel.findModelByCondition(PtPlacementTracker, { placementTrackerId: placementTrackerId })
                            .then(pt => {                               
                                response.documents = allDocs;
                                response.isVendor = 1,
                                response.pjEmployeeId = '';
                                response.employeeDetailsId = employeeDetailsId;
                                response.vendorId = Vendor_Id;
                                response.placementTrackerId = placementTrackerId;
                                response.clientCode = pt.customerId;
                                response.envelopeId = rs.onBoardingEnvelopeId;
                                response.envelopeType = 'Vendor';
                                //console.log(response)
                                done();
                            }).catch(err => {
                                done('placement tacker id not found in PtPlacementTracker : ' + err)
                            })
                    }).catch(err => {
                        done('could not found isVendor OR envelopeid in OnBoardingVendorEnvelopeSigners : ' + err)
                    })
            },
            function (done) {                       
                vendoronboardingModel.getEnvelopeFiles(signatureRequestId)
                    .then(rs1 => {                        
                        if (rs1 && rs1.success) {
                            response.docURL = config.apiHostUrl + '/Documents/' + rs1.fileName;
                            done();
                        }
                        else {
                            done('Error Createing File')
                        }
                    }).catch(err => {
                        done('Error Createing File : ' + err)

                    })
            }
        ], function (err, result) {
            if (err) {                
                commonMethods.catchError('vendoronboarding-controller/envelopeCompletion - ', err);
                // responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                return next({ isSuccess: false, message: err, data: '' });
            }
            else {                
                return next({ isSuccess: true, message: 'success', data: response })
            }
        })
    }

    sendSignatureRequestMail(req, res) {
        let response = responseFormat.createResponseTemplate();
        let envelopeId = req.body.envelopeId || 0;
        let self = this;
        let msgCode = [];

        if (!envelopeId) {
            msgCode.push('envelopeId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            vendoronboardingModel.getNextSigner(envelopeId)
                .then(rs => {
                    if (rs.length && rs[0].signerSignatureId) {
                        vendoronboardingModel.getEnvelopeDetails(rs[0].signerSignatureId)
                            .then(envDtl => {
                            if (envDtl.length) {
                                if (!rs[0].isVendor) {
                                    // send mail to other signer e.g. manager                                     
                                    let encKey = commonMethods.encrypt('SIGNERURL||' + rs[0].signerId + '||' + new Date().getTime());
                                    // let signerPage = '/vendor-onboarding/managerurl/'+encKey;
                                    let signerPage = encKey;
                                    let mailData = [
                                        { name: "ManagerFullName", value: rs[0].signerName },
                                        { name: "VendorName", value: envDtl[0].Vendor_Name },
                                        { name: "JobTitle", value: envDtl[0].jobTitle },
                                        { name: "ClientName", value: envDtl[0].clientName },
                                        { name: "On-boardingPage", value: signerPage }
                                    ];
                                                                      
                                    let options = {};
                                    if (envDtl[0].OnboardingRepEmail){
                                        options = {
                                            mailTemplateCode: enums.emailConfig.codes.helloSign.nextSignerEmail,
                                            toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                            ccMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName.trim() }],
                                            placeHolders: mailData,
                                            replyToEmailid: envDtl[0].OnboardingRepEmail,
                                            companyMasterId: 1, // for all type of company
                                            senderId: rs[0].signerEmployeeDetailsId || 0
                                        };
                                    }else{
                                        options = {
                                            mailTemplateCode: enums.emailConfig.codes.helloSign.nextSignerEmail,
                                            toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                            ccMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName.trim() }],
                                            placeHolders: mailData,
                                            replyToEmailid: envDtl[0].hrEmail,
                                            companyMasterId: 1, // for all type of company
                                            senderId: rs[0].signerEmployeeDetailsId || 0
                                        };
                                    }


                                    emailModel.mail(options, 'vendoronboarding-controller/sendSignatureRequestMail- managermail ')
                                        .then(ml => {
                                        })                                                                                                
                                }
                                else if (rs[0].isVendor) {
                                    // send mail to employee
                                    vendoronboardingModel.getEnvDetails(envDtl[0].placementTrackerId)
                                        .then(rec => {
                                            if (rec.length) {
                                                let code = {
                                                    placementTrackerId:envDtl[0].placementTrackerId,
                                                    email:rec[0].Client_Email
                                                }
                                                let encKey = commonMethods.encrypt(code);
                                                let mailData = [];
                                                if (rec[0].onboardingSignature){
                                                    mailData = [
                                                        { name: "RecipientFirstName", value: rs[0].signerFirstName.trim() },
                                                        { name: "JobTitle", value: envDtl[0].jobTitle },
                                                        { name: "ActivateToken", value: encKey },
                                                        { name: "SenderSignature", value: rec[0].onboardingSignature },
                                                        { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                        { name: "CandidateName", value: envDtl[0].candidateName.trim() }
                                                    ];
                                                }else{
                                                    mailData = [
                                                        { name: "RecipientFirstName", value: rs[0].signerFirstName.trim() },
                                                        { name: "JobTitle", value: envDtl[0].jobTitle },
                                                        { name: "ActivateToken", value: encKey },
                                                        { name: "SenderSignature", value: rec[0].hrSignature },
                                                        { name: "ClientName", value: envDtl[0].clientName.trim() },
                                                        { name: "CandidateName", value: envDtl[0].candidateName.trim() }
                                                    ];
                                                }
                                                let options = {
                                                    mailTemplateCode: enums.emailConfig.codes.helloSign.vendorEmail,
                                                    toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName.trim() }],
                                                    placeHolders: mailData,
                                                    ccMail: [{ mailId: rec[0].RecEmail_ID || '', displayName: '' }],
                                                    companyMasterId: 1, // for all type of company
                                                    senderId: rs[0].employeeDetailsId || 0
                                                };

                                                emailModel.mail(options, 'vendoronboarding-controller/sendSignatureRequestMail- signature_request_signed employee ')
                                                    .then(ml => {                                                           
                                                    })
                                            }
                                        })

                                }
                            }
                        })
                    }
                })            
        }

    }
}

module.exports = VendorOnboardingController;