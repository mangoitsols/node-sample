/**
 *  -------Import all classes and packages -------------
 */

import EmployeeonboardingModel from '../../models/employeeonboarding/employeeonboarding-model';
import CrudOperationModel from '../../models/common/crud-operation-model';
import EmailModel from '../../models/emails/emails-model';

// call all entities 
import { PtOfferLetter } from "../../entities/employeeonboarding/placementtracker-offerletter";
import { OnBoardingEnvelopes } from "../../entities/employeeonboarding/onBoarding-envelopes";
import { OnBoardingEnvelopeSigners } from "../../entities/employeeonboarding/onBoarding-envelope-signers";
import { PtProgressDetails } from "../../entities/employeeonboarding/pt-progress-details";
import { PtPlacementTracker } from "../../entities/employeeonboarding/pt-placementtracker";
import { EmployeeDetails } from '../../entities';
import { EmployeeAccessToken } from '../../entities/profileManagement/employee-access-token';
import { DMS } from '../../entities/employeeonboarding/dms';
import { documentChecklistTransaction } from '../../entities/employeeonboarding/document-checklist-transaction';

import responseFormat from '../../core/response-format';
import configContainer from '../../config/localhost';
import CommonMethods from '../../core/common-methods';
import enums from '../../core/enums';
import async from 'async';
import fs from 'fs';
import logger from '../../core/logger';
import _ from 'lodash';
import request from 'request';
import path from 'path';

/**
 *  -------Initialize global variabls-------------
 */
let config = configContainer.loadConfig(),
    commonMethods = new CommonMethods(),
    employeeonboardingModel = new EmployeeonboardingModel(),
    crudOperationModel = new CrudOperationModel();


// -------------------------- Hellosign 
// Initialize using api key
var hellosign = require('hellosign-sdk')({ key: config.helloSign.apiKey });
var helloSignClientId = config.helloSign.clientId;


const emailModel = new EmailModel();

export default class EmployeeonboardingController {
    constructor() {
        //
    }

    helloSignCallback(req, res, next) {
        res.status(200).send(req.body)
    }

    getAllTemplates(req, res, next) {
        let response = responseFormat.createResponseTemplate();

        let page = req.body.page || 1;
        let pageSize = req.body.pageSize || 100;
        let title = req.body.title || '';

        employeeonboardingModel.getAllTemplatesFromHelloSign(page, pageSize, title)
            .then(rs => {
                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: rs } });
                res.status(200).json(response);
            }).catch(err => {
                commonMethods.catchError('employeeonboarding-controller/getAllTemplates - ', err);
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
            employeeonboardingModel.getSignerOrderByTemplates(templateArray)
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

    getDocumentByTemplateId(req, res, next) {
        let response = responseFormat.createResponseTemplate();

        let templateId = req.params.templateId;
        employeeonboardingModel.getDocumentByTemplateId(templateId)
            .then(rs => {
                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: rs } });
                res.status(200).json(response);

            }).catch(err => {
                commonMethods.catchError('employeeonboarding-controller/getHsDocumentUrlByTemplateId - ', err);
                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: 417 });
                res.status(200).json(response);
            })
    }

    getHsDocumentUrlByTemplateId(req, res, next) {
        let response = responseFormat.createResponseTemplate();

        let templateId = req.params.templateId;
        employeeonboardingModel.getHsDocumentUrlByTemplateId(templateId)
            .then(rs => {
                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ fileUrl: rs.file_url }] } });
                res.status(200).json(response);
            }).catch(err => {
                commonMethods.catchError('employeeonboarding-controller/getHsDocumentUrlByTemplateId - ', err);
                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: 417 });
                res.status(200).json(response);
            })
    }

    getOfferLetter(req, res, next) {
        let authAccessToken = req.headers.authorizationToken;
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId,
            response = responseFormat.createResponseTemplate();

        employeeonboardingModel.getOfferLetter(employeeDetailsId, authAccessToken)
            .then(rs => {
                if (rs.length) {
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: rs } });
                    res.status(200).json(response);
                }
                else {
                    response = responseFormat.getResponseMessageByCodes(['errorText:offerLetterNotFound'], { code: 417 })
                    res.status(200).json(response);
                }
            }).catch(err => {
                let resp = commonMethods.catchError('employeeonboarding-controller/getOfferLetter - ' + employeeDetailsId + ' - ', err);
                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: resp.code });
                res.status(resp.code).json(response);
            })
    }

    updateOfferLetter(req, res, next) {
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId,
            response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let isAccepted = req.body.isAccepted;
        let offerLetterId = req.body.offerLetterId;
        let placementTrackerID = 0;
        let companyMasterId = enums.compnayMaster.default;
        let self = this;

        if (!offerLetterId || !commonMethods.isValidInteger(offerLetterId)) {
            msgCode.push('offerLetterId');
        }
        if (typeof isAccepted == 'undefined') {
            msgCode.push('isAccepted');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {

            async.series([
                function (done) {
                    crudOperationModel.findModelByCondition(PtOfferLetter, { offerLetterId: offerLetterId })
                        .then(rs => {
                            if (rs) {
                                placementTrackerID = rs.placementTrackerId;
                                done();
                            }
                            else {
                                response = responseFormat.getResponseMessageByCodes(['errorText:offerLetterNotFound'], { code: 417 });
                                res.status(200).json(response);
                            }
                        })
                },
                function (done) {
                    crudOperationModel.findModelByCondition(PtPlacementTracker, { placementTrackerId: placementTrackerID })
                        .then(ptTracker => {
                            if (ptTracker) {

                                companyMasterId = ptTracker.CompanyMaster_Id;
                                done();
                            }
                            else {
                                commonMethods.catchError('employeeOnboarding/updateOfferletter', 'ptTracker id not found')
                                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: resp.code });
                                res.status(resp.code).json(response);
                            }
                        });
                },
                function (done) {
                    let olData = {
                        offerLetter: enums.helloSign.offerLetterStatus.completed,
                        offerLetterUpdatedOn: new Date()
                    };
                    crudOperationModel.updateAll(PtProgressDetails, olData, { placementTrackerId: placementTrackerID, offerLetter: { $ne: enums.helloSign.offerLetterStatus.completed } })
                        .then(rs1 => {

                            if (rs1[0]) {
                                // send mail to hr 

                                employeeonboardingModel.getEnvelopeDetailsByPtId(placementTrackerID)
                                    .then(envDtl => {
                                        // =========================
                                        commonMethods.writeLog('srd.txt','offerLetter('+placementTrackerID+')'+JSON.stringify(envDtl));
                                        // ========================
                                        if (envDtl.length) {
                                            let mailData = [
                                                { name: "CandidateName", value: envDtl[0].empFirstName + ' ' + envDtl[0].empLastName },
                                                { name: "JobTitle", value: envDtl[0].jobTitle },
                                                { name: "ClientName", value: envDtl[0].clientName },
                                                { name: "CityName", value: envDtl[0].city }
                                            ];

                                            let options = {};
                                            if (envDtl[0].OnboardingRepEmail){
                                                options = {
                                                    mailTemplateCode: enums.emailConfig.codes.helloSign.offerLetterAccepted,
                                                    toMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName }],
                                                    ccMail: [
                                                        { mailId: envDtl[0].recEmail, displayName: envDtl[0].recFirstName },
                                                        { mailId: envDtl[0].salesEmail, displayName: envDtl[0].salesFirstName }
                                                    ],
                                                    placeHolders: mailData,
                                                    companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                    senderId: employeeDetailsId || 0
                                                };
                                            }else{
                                                options = {
                                                    mailTemplateCode: enums.emailConfig.codes.helloSign.offerLetterAccepted,
                                                    // toMail: [{ mailId: '', displayName: '', configKeyName:'HRSUPPORTEMAIL' }],
                                                    toMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName }],
                                                    ccMail: [
                                                        { mailId: envDtl[0].recEmail, displayName: envDtl[0].recFirstName },
                                                        { mailId: envDtl[0].salesEmail, displayName: envDtl[0].salesFirstName }
                                                    ],
                                                    placeHolders: mailData,
                                                    companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                    senderId: employeeDetailsId || 0
                                                };
                                            } 
                                            emailModel.mail(options, 'employeeonboarding-model/createEnvelope createEnvelope-warning')
                                                .then(rs => { })
                                        }
                                    })

                            }

                            done();
                        })
                },
                function (done) {
                    // get first applicable envelope create envelope and send mail to first-signer if First-signer is not Employee
                    employeeonboardingModel.getEnvelopeInfo(employeeDetailsId)
                        .then(rs => {
                            if (rs.length && !rs[0].isEmployee) {
                                let createEnvelope = 0;
                                let bgStatus = rs.length ? rs[0].bgStatus : 0;
                                let clientStatus = rs.length ? rs[0].clientStatus : 0;
                                let benefitStatus = rs.length ? rs[0].benefitStatus : 0;
                                let bgCheckNa = [enums.helloSign.bgCheckStatus.na];
                                let clientDocNa = [enums.helloSign.clientDocStatus.na];
                                let benefitNa = [enums.helloSign.benefitStatus.na, enums.helloSign.benefitStatus.ni];

                                if (rs[0].envelopeTypeId == enums.helloSign.envelopeType.bgCheck && bgCheckNa.indexOf(bgStatus) < 0) {
                                    createEnvelope = 1;
                                }
                                else if (rs[0].envelopeTypeId == enums.helloSign.envelopeType.clientDoc && clientDocNa.indexOf(clientStatus) < 0) {
                                    createEnvelope = 1;
                                }
                                else if (rs[0].envelopeTypeId == enums.helloSign.envelopeType.benefit && benefitNa.indexOf(benefitStatus) < 0) {
                                    createEnvelope = 1;
                                }

                                if (createEnvelope && rs[0].envelopeStatus == enums.helloSign.envelopStatus.draft) {
                                    self.createEnvelope(employeeDetailsId, rs[0].envelopeId, function (rssp) {
                                        // send mail to first signer
                                        if (rssp.responseFormat.code == 200) {
                                            employeeonboardingModel.getNextSigner(rs[0].envelopeId)
                                                .then(signer => {

                                                    if (signer.length && !signer[0].isEmployee && signer[0].signerSignatureId) {
                                                        employeeonboardingModel.getEnvelopeDetails(signer[0].signerSignatureId)
                                                            .then(envDtl => {

                                                                if (envDtl.length) {
                                                                    let encKey = commonMethods.encrypt('SIGNERURL||' + signer[0].signerId + '||' + new Date().getTime());

                                                                    // let signerPage = '/emp-onboarding/managerurl/'+encKey;
                                                                    let signerPage = encKey;

                                                                    let mailData = [
                                                                        { name: "ManagerFullName", value: signer[0].signerName },
                                                                        { name: "EmployeeFullName", value: envDtl[0].empFirstName + ' ' + envDtl[0].empLastName },
                                                                        { name: "StepName", value: envDtl[0].envelopeType },
                                                                        { name: "JobTitle", value: envDtl[0].jobTitle },
                                                                        { name: "ClientName", value: envDtl[0].clientName },
                                                                        { name: "CityName", value: envDtl[0].city },
                                                                        { name: "On-boardingPage", value: signerPage }
                                                                    ];

                                                                    let options = {};
                                                                    if (rs[0].OnboardingRepEmail){
                                                                        options = {
                                                                            mailTemplateCode: enums.emailConfig.codes.helloSign.manager,
                                                                            toMail: [{ mailId: signer[0].signerEmail, displayName: signer[0].signerName }],
                                                                            placeHolders: mailData,
                                                                            ccMail: [{ mailId: rs[0].OnboardingRepEmail, displayName: rs[0].OnboardingRepFirstName }],
                                                                            replyToEmailid: rs[0].OnboardingRepEmail,
                                                                            companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                                            senderId: employeeDetailsId || 0
                                                                        };
                                                                    }else{
                                                                        options = {
                                                                            mailTemplateCode: enums.emailConfig.codes.helloSign.manager,
                                                                            toMail: [{ mailId: signer[0].signerEmail, displayName: signer[0].signerName }],
                                                                            placeHolders: mailData,
                                                                            ccMail: [{ mailId: rs[0].hrEmail, displayName: rs[0].hrFirstName }],
                                                                            replyToEmailid: rs[0].hrEmail,
                                                                            companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                                            senderId: employeeDetailsId || 0
                                                                        };
                                                                    } 

                                                                    
                                                                    if (envDtl[0].consultantType == 1){
                                                                        if (envDtl[0].vendorEmail){
                                                                            options.ccMail.push({ mailId: envDtl[0].vendorEmail, displayName: envDtl[0].vendorName })
                                                                        }
                                                                    }

                                                                    emailModel.mail(options, 'employeeonboarding-controller/sendSignatureRequestMail- managermail ')
                                                                        .then(ml => { })
                                                                    done();
                                                                }
                                                                else {
                                                                    commonMethods.catchError('employeeOnboarding/updateOfferletter', 'mail could not sent to first signer')
                                                                    done();
                                                                }
                                                            })
                                                    }
                                                    else {
                                                        commonMethods.catchError('employeeOnboarding/updateOfferletter', 'could not get first signer or first signer is not employee')
                                                        done()
                                                    }
                                                })
                                        }
                                        else {
                                            commonMethods.catchError('employeeOnboarding/updateOfferletter', 'envelope could not be created')
                                            done();
                                        }

                                    })
                                }
                                else {
                                    done()
                                }
                            }
                            else {
                                // no envelope found to create
                                done()
                            }
                        })

                },
                function (done) {
                    //===================== add Utm params in DB =====================//
                    commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.empOnboardOfferAccepted, placementTrackerID, employeeDetailsId, function (rs) { });
                    //================================================================//
                    done();
                }
            ], function (err, result) {
                if (!err) {
                    response = responseFormat.getResponseMessageByCodes(['success:saved']);
                    res.status(200).json(response);
                }
                else {
                    // exception with err
                    let resp = commonMethods.catchError('employeeonboarding-controller/updateOfferLetter - empDetailId ' + employeeDetailsId + ' - ', err);
                    response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: resp.code });
                    res.status(resp.code).json(response);
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

    createEnvelope(employeeDetailsId, envelopId = null, next) {
        // let employeeDetailsId = req.tokenDecoded ?  req.tokenDecoded.data.employeeDetailsId : 0;
        // let envelopId = req.body.envelopId || null;

        let response = responseFormat.createResponseTemplate();
        let envelopeData = {};
        let dbEnvelopeId = 0;
        let envelopeTypeId = 0;
        let placementTrackerId = 0;
        let companyMasterId = enums.compnayMaster.default;
        let signUrl = '';
        let errorMessage = '';
        let helloError = 0;
        let respObj = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        async.series([

            function (done) {
                // create evelope
                employeeonboardingModel.createEnvelope(employeeDetailsId, envelopId)
                    .then(rs => {                        
                        envelopeData = rs.helloSignData;
                        dbEnvelopeId = rs.dbEnvelopeId;
                        envelopeTypeId = rs.envelopeTypeId;
                        placementTrackerId = rs.placementTrackerId;
                        companyMasterId = rs.companyMasterId;
                        done();
                    }).catch(err => {
                        errorMessage =  err;
                        helloError = 1;
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
                        // console.log(rs.apiLogId)
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
                crudOperationModel.updateAll(OnBoardingEnvelopes, envData, { onBoardingEnvelopeId: dbEnvelopeId })
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
                        updatedBy: employeeDetailsId ? employeeDetailsId : envelopeData.createdBy,
                        updatedOn: new Date()
                    }

                    crudOperationModel.findModelByCondition(OnBoardingEnvelopeSigners, { envelopeSignerEmail: item.signer_email_address.trim(), onBoardingEnvelopeId: dbEnvelopeId, envelopeSignerName: item.signer_name.trim() })
                        .then(getEnvDetail => {
                            if (getEnvDetail) {
                                crudOperationModel.updateAll(OnBoardingEnvelopeSigners, signersData, { envelopeSignerEmail: item.signer_email_address.trim(), onBoardingEnvelopeId: dbEnvelopeId, envelopeSignerName: item.signer_name.trim() })
                                    .then(rs => {
                                        if (!rs[0]) {
                                            commonMethods.catchError('Save Signers error : ', " DbEnvlopeId : " + dbEnvelopeId + " || " + JSON.stringify(item))
                                        }
                                        else {
                                            //========for reporting purpose
                                            // let data = { whereCondition: {envelopeSignerEmail : item.signer_email_address.trim(), onBoardingEnvelopeId : dbEnvelopeId, envelopeSignerName : item.signer_name.trim()},
                                            //                  signersData : signersData};
                                            // commonMethods.catchErrorHellosign('employeeonboarding-controller/createEnvelope 1 - : ', JSON.stringify(data)); 
                                        }
                                    })
                            }
                            else {
                                let data = {
                                    whereCondition: { envelopeSignerEmail: item.signer_email_address.trim(), onBoardingEnvelopeId: dbEnvelopeId, envelopeSignerName: item.signer_name.trim() },
                                    signersData: signersData
                                };
                                commonMethods.catchErrorHellosign('employeeonboarding-controller/createEnvelope 2- : ', JSON.stringify(data));
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
                if (envelopeTypeId == enums.helloSign.envelopeType.bgCheck) {
                    pdata['bgCheckEnvStatus'] = enums.helloSign.bgCheckStatus.inprocess;
                    // pdata['bgUpdatedOn'] = new Date();
                }
                else if (envelopeTypeId == enums.helloSign.envelopeType.clientDoc) {
                    pdata['clientEnvStatus'] = enums.helloSign.clientDocStatus.inprocess;
                    // pdata['clientEnvUpdatedOn'] = new Date();
                }
                else if (envelopeTypeId == enums.helloSign.envelopeType.benefit) {
                    pdata['benefitsEnvStatus'] = enums.helloSign.benefitStatus.inprocess;
                    // pdata['benefitsEnvUpdatedOn'] = new Date();
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
                employeeonboardingModel.getSignUrl(envelopeData.signatures[0].signature_id)
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
                let response = commonMethods.catchError('employeeonboarding-controller/createEnvelopeByTemplateId - : ', err);
                if (helloError == 1){
                    respObj.responseFormat = responseFormat.getResponseMessageByCodes(['errorText:'+errorMessage.message], { code: 417 });
                }else{
                    respObj.statusCode = response.code;
                    respObj.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });                
                }             
                
                next(respObj);               
            }
            else {
                respObj.statusCode = 200;
                respObj.responseFormat = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ signUrl: signUrl }] } });
                next(respObj);
            }
        })
    }

    getSignUrl(employeeDetailsId, next) {
        // let response = responseFormat.createResponseTemplate();
        let respObj = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        employeeonboardingModel.getEnvelopeInfo(employeeDetailsId)
            .then(env => {
                if (env.length) {
                    let employeeSign = env.filter(item => {
                        return item.isEmployee
                    })

                    return employeeSign[0].signerSignatureId;
                }
                else {
                    return 0;
                }
            })
            .then(signatureId => {
                employeeonboardingModel.getSignUrl(signatureId)
                    .then(rs => {
                        let signUrl = rs + '&client_id=' + config.helloSign.clientId;
                        respObj.statusCode = 200;
                        respObj.responseFormat = responseFormat.getResponseMessageByCodes([''], { content: { dataList: [{ signUrl: signUrl }] } });
                        next(respObj)
                    }).catch(err => {
                        let response = commonMethods.catchError('employeeonboarding-controller/getSignUrl 1 - : ', err);
                        respObj.statusCode = response.code;
                        respObj.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(respObj);
                    })
            }).catch(err => {
                let response = commonMethods.catchError('employeeonboarding-controller/getSignUrl 2 - : ', err);
                respObj.statusCode = response.code;
                respObj.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(respObj);
            })
    }



    callSignUrlWithEnvelope(req, res, next) {
        // console.log("===<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>===");
        let response = responseFormat.createResponseTemplate();
        let employeeDetailsId = req.tokenDecoded ? req.tokenDecoded.data.employeeDetailsId : 0;
        let envelopeId = req.params.envelopeId || 0;
        let self = this;
        let msgCode = [];

        if (!employeeDetailsId) {
            msgCode.push('employeeDetailsId')
        }
        if (!envelopeId) {
            msgCode.push('envelopeId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {

            crudOperationModel.findModelByCondition(OnBoardingEnvelopes, { onBoardingEnvelopeId: envelopeId })
                .then(pt => {
                    if (pt) {

                        if (pt.envelopeStatus == enums.helloSign.envelopStatus.draft) {
                            self.createEnvelope(employeeDetailsId, envelopeId, function (rs) {
                                res.status(rs.statusCode).json(rs.responseFormat);
                            });
                        }
                        else if (pt.envelopeStatus == enums.helloSign.envelopStatus.created) {
                            self.signinUrlWithEnvelope(envelopeId, function (rs) {
                                if (rs.envelopeSignerId) {
                                    employeeonboardingModel.getSignUrl(rs.envelopeSignerId)
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
                                            let response = commonMethods.catchError('employeeonboarding-controller/callSignUrlWithEnvelope - : ', err);
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

    saveUtmParams(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let employeeDetailsId = req.tokenDecoded ? req.tokenDecoded.data.employeeDetailsId : 0;
        let stepName = req.body.stepName || '';
        let envId = req.body.envId || 0;

        if (stepName == 'empOnboardBGDocSigned') {
            //===================== add Utm params in DB =====================//
            commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.empOnboardBGDocSigned, envId, employeeDetailsId, function (rs) { });
            //================================================================//
        } else if (stepName == 'empOnboardW2DocSigned') {
            //===================== add Utm params in DB =====================//
            commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.empOnboardW2DocSigned, envId, employeeDetailsId, function (rs) { });
            //================================================================//
        } else if (stepName == 'empOnboardBenefitsDocSigned') {
            //===================== add Utm params in DB =====================//
            commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.empOnboardBenefitsDocSigned, envId, employeeDetailsId, function (rs) { });
            //================================================================//
        }


        res.status(200).json(response);
    }

    signinUrlWithEnvelope(envlopeId, next) {
        crudOperationModel.findModelByCondition(OnBoardingEnvelopeSigners, { onBoardingEnvelopeId: envlopeId, isEmployee: 1, envelopeSignerSignedAt: null })
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
                let response = commonMethods.catchError('employeeonboarding-controller/signinUrlWithEnvelope - : ', err);
                next({ envelopeSignerId: '' });
            });;
    }

    initiateEnvelopeProcess(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let employeeDetailsId = req.body.employeeDetailsId || 0;
        let envelopeId = req.body.envelopeId || 0;
        let self = this;
        let msgCode = [];

        if (!employeeDetailsId) {
            msgCode.push('employeeDetailsId')
        }
        if (!envelopeId) {
            msgCode.push('envelopeId')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            self.createEnvelope(employeeDetailsId, envelopeId, function (rs) {
                res.status(rs.statusCode).json(rs.responseFormat);
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
                employeeonboardingModel.signerEvent(data, eventBody.signature_id)
                    .then(rs => {

                        res.status(200).send(eventBody);

                    }).catch(err => {
                        commonMethods.catchError('employeeonboarding-controller/saveEvents signature_request_signed immidiate : ', err);
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
                employeeonboardingModel.signerEvent(data, currentSignatereId)
                    .then(rs => {
                        if (rs.length) {
                            // generate code and mail will be sent to other signer

                            employeeonboardingModel.getEnvelopeDetails(currentSigner[0].signature_id)
                                .then(envDtl => {

                                    //=== get company master id
                                    if (envDtl.length) {
                                        companyMasterId = envDtl[0].companyMasterId;
                                    }




                                    if (envDtl.length && !rs[0].isEmployee) {
                                        let encKey = commonMethods.encrypt('SIGNERURL||' + rs[0].signerId + '||' + new Date().getTime());

                                        // let signerPage = '/emp-onboarding/managerurl/'+encKey;
                                        let signerPage = encKey;

                                        let mailData = [
                                            { name: "ManagerFullName", value: rs[0].signerName },
                                            { name: "EmployeeFullName", value: envDtl[0].empFirstName },
                                            { name: "StepName", value: envDtl[0].envelopeType },
                                            { name: "JobTitle", value: envDtl[0].jobTitle },
                                            { name: "ClientName", value: envDtl[0].clientName },
                                            { name: "CityName", value: envDtl[0].city },
                                            { name: "On-boardingPage", value: signerPage }
                                        ];

                                        let options = {};
                                        if (envDtl[0].OnboardingRepEmail){
                                            options = {
                                                mailTemplateCode: enums.emailConfig.codes.helloSign.manager,
                                                toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                                ccMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName }],
                                                placeHolders: mailData,
                                                replyToEmailid: envDtl[0].OnboardingRepEmail,
                                                companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                senderId: rs[0].signerEmployeeDetailsId || 0
                                            };
                                        }else{
                                            options = {
                                                mailTemplateCode: enums.emailConfig.codes.helloSign.manager,
                                                toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                                ccMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName }],
                                                placeHolders: mailData,
                                                replyToEmailid: envDtl[0].hrEmail,
                                                companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                senderId: rs[0].signerEmployeeDetailsId || 0
                                            };
                                        } 

                                        if (envDtl[0].consultantType == 1){
                                            if (envDtl[0].vendorEmail){
                                                options.ccMail.push({ mailId: envDtl[0].vendorEmail, displayName: envDtl[0].vendorName })
                                            }
                                        }

                                        logger.info(options);

                                        emailModel.mail(options, 'employeeonboarding-controller/saveEvents- signature_request_signed ')
                                            .then(rs => { })
                                    }
                                    else if (envDtl.length && rs[0].isEmployee) {
                                        employeeonboardingModel.getEnvDetails(envDtl[0].placementTrackerId)
                                            .then(rec => {
                                                if (rec.length) {
                                                    let token = commonMethods.encrypt('LOGIN||' + rs[0].employeeDetailsId + '||' + rs[0].signerEmail + '||' + new Date().getTime());
                                                    let mailData = [];
                                                    if (rec[0].OnboardingRepEmail){
                                                        mailData = [
                                                            { name: "RecipientFullName", value: rs[0].signerName },
                                                            { name: "SenderSignature", value: rec[0].onboardingSignature },
                                                            { name: "AutoLoginToken", value: token },
                                                            { name: "RecipientFirstName", value: rs[0].signerFirstName },
                                                            { name: "JobTitle", value: envDtl[0].jobTitle }
                                                        ];
                                                    }else{
                                                        mailData = [
                                                            { name: "RecipientFullName", value: rs[0].signerName },
                                                            { name: "SenderSignature", value: rec[0].hrSignature },
                                                            { name: "AutoLoginToken", value: token },
                                                            { name: "RecipientFirstName", value: rs[0].signerFirstName },
                                                            { name: "JobTitle", value: envDtl[0].jobTitle }
                                                        ];
                                                    }

                                                    let tempalteCode = enums.emailConfig.codes.helloSign.employee;

                                                    if (envDtl[0].envelopeTypeId == enums.helloSign.envelopeType.bgCheck) {
                                                        tempalteCode = enums.emailConfig.codes.helloSign.employeeBg;
                                                    }
                                                    else if (envDtl[0].envelopeTypeId == enums.helloSign.envelopeType.clientDoc) {
                                                        tempalteCode = enums.emailConfig.codes.helloSign.employeeCt;
                                                    }
                                                    else if (envDtl[0].envelopeTypeId == enums.helloSign.envelopeType.benefit) {
                                                        tempalteCode = enums.emailConfig.codes.helloSign.employeeBt;
                                                    }


                                                    let options = {};
                                                    if (rec[0].OnboardingRepEmail){
                                                        options = {
                                                            mailTemplateCode: tempalteCode,
                                                            toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                                            ccMail: [
                                                                { mailId: rec[0].RecEmail_ID || '', displayName: '' },
                                                                { mailId: rec[0].OnboardingRepEmail || '', displayName: '' }
                                                            ],
                                                            placeHolders: mailData,
                                                            replyToEmailid: rec[0].OnboardingRepEmail,
                                                            companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                            senderId: rs[0].signerEmployeeDetailsId || 0
                                                        };
                                                    }else{
                                                        options = {
                                                            mailTemplateCode: tempalteCode,
                                                            toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                                            ccMail: [
                                                                { mailId: rec[0].RecEmail_ID || '', displayName: '' },
                                                                { mailId: rec[0].HREmail_ID || '', displayName: '' }
                                                            ],
                                                            placeHolders: mailData,
                                                            replyToEmailid: rec[0].HREmail_ID,
                                                            companyMasterId: companyMasterId || enums.compnayMaster.default,
                                                            senderId: rs[0].signerEmployeeDetailsId || 0
                                                        };
                                                    } 

                                                    if (envDtl[0].consultantType == 1){
                                                        if (envDtl[0].vendorEmail){
                                                            options.ccMail.push({ mailId: envDtl[0].vendorEmail, displayName: envDtl[0].vendorName })
                                                        }
                                                    }

                                                    emailModel.mail(options, 'employeeonboarding-controller/saveEvents- signature_request_signed employee ')
                                                        .then(rs => { })
                                                }
                                            })

                                    }
                                })


                        }
                        res.status(200).send(eventBody);
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
                employeeonboardingModel.signerEvent(data, currentSignatereId)
                    .then(rs => {
                        res.status(200).send(eventBody);
                    })

            }
            else if (typeof eventBody.event == 'object' && eventBody.event.event_type == 'signature_request_all_signed') {
                let data = {
                    signingProviderEnvelopeStatus: enums.helloSign.keyValueStatus.signature_request_all_signed,
                    updatedOn: new Date()
                }
                employeeonboardingModel.envelopeEvent(data, eventBody.signature_request_id)
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
                    employeeonboardingModel.envelopeEvent(data, hellosignEnvelopeData.signature_request_id)
                        .then(rs => {
                            self.envelopeCompletion(hellosignEnvelopeData.signature_request_id, function (resp) {
                                if (!resp.isSuccess) {
                                    // error mail to hr
                                    self.sendEnvelopeErrorMail(resp.data.placementTrackerId, enums.emailConfig.codes.helloSign.envlopeCompletionFail, 'failed')
                                }
                                else {
                                    // call webhook url and send mail to hrsupport

                                    let options = {
                                        method: 'POST',
                                        url: config.thirdPartyApiUrl + config.hsDocCreatedEndPoint,
                                        body: resp.data,
                                        timeout: 30000,
                                        json: true
                                    };

                                    request(options, function (error, response, body) {
                                        if (body.status == 200 && body.message.toLowerCase() == 'success') {
                                            self.sendEnvelopeCompletionMail(resp.data.placementTrackerId, enums.emailConfig.codes.helloSign.envlopeCompleted, 'success')
                                        }
                                        else {
                                            // error mail to hr
                                            self.sendEnvelopeErrorMail(resp.data.placementTrackerId, enums.emailConfig.codes.helloSign.envlopeCompletionFail, 'api failed')
                                        }
                                    })

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
                commonMethods.catchError('employeeonboarding-controller/saveEvents - ', eventBody.event.event_type);
                res.status(200).send(eventBody);
            }
            else if (typeof eventBody.event == 'string' && eventBody.event == 'error') {
                commonMethods.catchError('employeeonboarding-controller/saveEvents [Error event] - ', eventBody.description);
                res.status(200).send(eventBody);
            }
            else {
                commonMethods.catchError('employeeonboarding-controller/saveEvents [UNHANDLED EVENT TRACK] - ', eventBody);
                res.status(200).send(eventBody);
            }

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
                            employeeonboardingModel.getSignerInfoBySignerId(signerId)
                                .then(signer => {
                                    if (signer.length) {
                                        employeeonboardingModel.getSignUrl(signer[0].signerSignatureId)
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
                                                let resp = commonMethods.catchError('employeeonboarding-controller/getSignUrlForOtherSigner : ', err);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })
                                    }
                                    else {
                                        response = responseFormat.getResponseMessageByCodes(['errorText:signerId'], { code: 417 });
                                        res.status(200).json(response);
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
            crudOperationModel.findModelByCondition(OnBoardingEnvelopes, { onBoardingEnvelopeId: envelopeId })
                .then(rs => {
                    if (rs) {
                        employeeonboardingModel.getEnvelopeFiles(rs.signingProviderEnvelopeId)
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
                                let resp = commonMethods.catchError('employeeonboarding-controller/getEnvelopeFiles - ', err);
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

    uploadAttachment(req, res, next) {
        let authAccessToken = req.headers.authorizationToken;
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        let docName = req.body.docName ? req.body.docName.trim() : '';
        let docId = req.body.docId || 0;
        let fileName = req.body.fileName ? req.body.fileName.trim() : '';
        let fileData = req.body.fileData;
        let expiryDate = req.body.expiryDate || null;

        let docVars = enums.uploadType.ptDocs;
        let pjEmployeeId = null;
        let placementTrackerId = 0;
        let employeeTypeId = null;
        let companyMasterId = enums.compnayMaster.default;

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
                    // check if pj-employee-id created
                    crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                        .then(rs => {
                            if (rs) {
                                if (rs.employeeId) {
                                    pjEmployeeId = rs.employeeId;
                                    docVars = enums.uploadType.employeeDocs;
                                    done();
                                }
                                else {
                                    done();
                                }
                            }
                            else {
                                done('invalid user')
                            }
                        }).catch(err => {
                            done(err)
                        })
                },
                function (done) {
                    // get placement tracker id
                    employeeonboardingModel.getOfferLetter(employeeDetailsId, authAccessToken)
                        .then(rs => {
                            if (rs.length) {
                                if (rs[0].consultantType == 1 || rs[0].consultantType == 0) {
                                    employeeTypeId = rs[0].consultantType;
                                    placementTrackerId = rs[0].placementTrackerId;
                                    companyMasterId = rs[0].companyMasterId || enums.compnayMaster.default;
                                    done();
                                }
                                else {
                                    commonMethods.catchError('employeeOnboarding/uploadAttachment', 'Placement tracker not initiated and consultantType is ' + rs[0].consultantType);
                                    response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: resp.code });
                                    res.status(resp.code).json(response);
                                }
                            }
                            else {
                                commonMethods.catchError('employeeOnboarding/uploadAttachment', 'Placement tracker not initiated');
                                response = responseFormat.getResponseMessageByCodes(['errorText:templateId'], { code: resp.code });
                                res.status(resp.code).json(response);
                            }
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
                                    DocumentType: enums.documentType.onboarding,
                                    dataInsertFrom: enums.dataInsertFrom.onboarding,
                                    placementTrackerId: placementTrackerId,
                                    CompanyMaster_Id: companyMasterId,
                                    BaseUrlTypeId: enums.baseUrlType.typeId
                                };

                                // console.log(docData); // SRD - onboarding file upload 
                                crudOperationModel.saveModel(DMS, docData, { dmsId: 0 })
                                    .then((result) => {
                                        if (result) {
                                            let transData = {
                                                groupId: employeeTypeId == 1 ? 1 : 3,  //if sub-contractor (1) then 1 else 3 for employee
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
                    let resp = commonMethods.catchError('employeeonboarding-controller/uploadAttachment empDetailId - ' + employeeDetailsId + ' final -', err);
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

    deleteAttachment(req, res, next) {
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
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
                        employeeonboardingModel.getTemplateDetails(item)
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
                    let resp = commonMethods.catchError('employeeonboarding-controller/getSignerByTemplateIds final - ', err);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                }
            })

        }


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

    getAttachment(req, res, next) {
        let authAccessToken = req.headers.authorizationToken;
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        let response = responseFormat.createResponseTemplate();
        let envelopeId = req.body.envelopeId || 0;
        let msgCode = [];


        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            employeeonboardingModel.getOfferLetter(employeeDetailsId,authAccessToken)
                .then(rs => {
                    if (rs.length) {
                        employeeonboardingModel.getAttachements(rs[0].placementTrackerId, employeeDetailsId)
                            .then(rs1 => {
                                // if(rs1.length)
                                // {
                                response = responseFormat.getResponseMessageByCodes([''], { content: { dataList: rs1 } });
                                res.status(200).json(response);
                                // }
                                // else
                                // {
                                //     response = responseFormat.getResponseMessageByCodes(['errorText:noAttachement'], { code: 417 });
                                //     res.status(200).json(response);
                                // }
                            }).catch(err => {
                                let resp = commonMethods.catchError('employeeonboarding-controller/getAttachment - empDetailId -' + employeeDetailsId + ' - ', err);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['errorText:noAttachement'], { code: 417 });
                        res.status(200).json(response);
                    }

                })
        }
    }

    envelopeCompletion(signatureRequestId, next) {
        let allDocs = [];
        let envelopeId = 0;
        let envelopeType = 0;
        let placementTrackerId = 0;

        let response = {
            "eventType": "downloadDocURL",
            "docURL": "",
            "documents": [],
            "isEmployee": 0,
            "pjEmployeeId": "",
            "employeeDetailsId": 0,
            "placementTrackerId": 0,
            "clientCode": "",
            "envelopeId": 0,
            "envelopeType": ""
        }

        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(OnBoardingEnvelopes, { signingProviderEnvelopeId: signatureRequestId })
                    .then(temps => {

                        envelopeId = temps.onBoardingEnvelopeId;
                        envelopeType = temps.envelopeType;
                        placementTrackerId = temps.placementTrackerId;
                        let templates = temps.signingProvidersTemplateIds.trim().replace(/(^,)|(,$)/g, "").split(',');
                        async.mapSeries(templates, function (item, cb) {
                            let tempDocs = [];
                            employeeonboardingModel.getDocumentByTemplateId(item)
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

                crudOperationModel.findModelByCondition(OnBoardingEnvelopeSigners, { onBoardingEnvelopeId: envelopeId, isEmployee: 1 })
                    .then(rs => {
                        // crudOperationModel.findModelByCondition(EmployeeDetails, {employeeDetailsId : rs.employeeDetailsId})
                        employeeonboardingModel.getEmployeeAssociation(rs.employeeDetailsId)
                            .then(rs1 => {
                                if (rs1.length) {
                                    crudOperationModel.findModelByCondition(PtPlacementTracker, { placementTrackerId: placementTrackerId })
                                        .then(pt => {
                                            response.documents = allDocs;
                                            response.isEmployee = rs1[0].employeeDetailsId ? 1 : 0, // rs1[0].employeeId && rs1[0].associatedOn ? 1 : 0;
                                                response.pjEmployeeId = rs1[0].employeeId && rs1[0].associatedOn ? rs1[0].employeeId : '';
                                            response.employeeDetailsId = rs1[0].employeeDetailsId;
                                            response.placementTrackerId = placementTrackerId;
                                            response.clientCode = pt.customerId;
                                            response.envelopeId = rs.onBoardingEnvelopeId;
                                            response.envelopeType = enums.helloSign.envelopeCode[envelopeType];
                                            done();
                                        }).catch(err => {
                                            done('placement tacker id not found in PtPlacementTracker : ' + err)
                                        })
                                }
                                else {
                                    done('Employee Details id not found')
                                }
                            }).catch(err => {
                                done('Employee Details id not found on singer table : ' + err)
                            })
                    }).catch(err => {
                        done('could not found isEmployee OR envelopeid in OnBoardingEnvelopeSigners : ' + err)
                    })
            },
            function (done) {
                employeeonboardingModel.getEnvelopeFiles(signatureRequestId)
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
                commonMethods.catchError('employeeonboarding-controller/envelopeCompletion - ', err);
                // responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                return next({ isSuccess: false, message: err, data: '' });
            }
            else {
                return next({ isSuccess: true, message: 'success', data: response })
            }
        })


    }

    sendEnvelopeCompletionMail(placementTrackerId, templateId, caller) {
        employeeonboardingModel.getCompletedEnvelope(placementTrackerId)
            .then(envDtl => {
                commonMethods.writeLog('srd.txt','PlacementCompletion('+placementTrackerId+')'+JSON.stringify(envDtl));
                if (envDtl.length) {
                    let fileUrl = 'https://' + config.helloSign.apiKey + ':@api.hellosign.com' + (envDtl[0].fileUrl.replace(/final_copy/g, "files")) + '?file_type=zip';

                    let zipFileUrl = '';

                    if (envDtl[0].employeeDetailsId) {
                        // zipFileUrl = envDtl[0].zipFilePath ? config.portalHostUrl + config.documentBasePath + enums.uploadType.employeeDocs.path + '/' + envDtl[0].employeeDetailsId + '/' + envDtl[0].zipFilePath : '';
                        zipFileUrl = envDtl[0].zipFilePath ? config.documentHostUrl + config.documentBasePath + enums.uploadType.employeeDocs.path + '/' + envDtl[0].employeeDetailsId + '/' + envDtl[0].zipFilePath : '';
                    }
                    else {
                        zipFileUrl = '';
                    }

                    let mailData = [
                        { name: "CandidateFullName", value: envDtl[0].empFirstName + ' ' + envDtl[0].empLastName },
                        { name: "CandidateName", value: envDtl[0].empFirstName },
                        { name: "StepName", value: envDtl[0].envelopeType },
                        { name: "JobTitle", value: envDtl[0].jobTitle },
                        { name: "ClientName", value: envDtl[0].clientName },
                        { name: "CityName", value: envDtl[0].city },
                        { name: "DownloableLink", value: fileUrl },
                        { name: "DOCUMENTURL", value: zipFileUrl },

                    ];

                    let options = {};
                    if (envDtl[0].OnboardingRepEmail){
                        options = {
                            mailTemplateCode: templateId,
                            toMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName }],
                            ccMail: [
                                { mailId: envDtl[0].salesEmail, displayName: envDtl[0].salesFirstName },
                                { mailId: envDtl[0].recEmail, displayName: envDtl[0].recFirstName }
                                //{ mailId: envDtl[0].empEmail, displayName: envDtl[0].empFirstName }
                            ],
                            placeHolders: mailData,
                            companyMasterId: envDtl[0].companyMasterId || enums.compnayMaster.default,
                            senderId: envDtl[0].employeeDetailsId || 0
                        };
                    }else{
                        options = {
                            mailTemplateCode: templateId,
                            toMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName }],
                            ccMail: [
                                { mailId: envDtl[0].salesEmail, displayName: envDtl[0].salesFirstName },
                                { mailId: envDtl[0].recEmail, displayName: envDtl[0].recFirstName }
                                //{ mailId: envDtl[0].empEmail, displayName: envDtl[0].empFirstName }
                            ],
                            placeHolders: mailData,
                            companyMasterId: envDtl[0].companyMasterId || enums.compnayMaster.default,
                            senderId: envDtl[0].employeeDetailsId || 0
                        };
                    }

                    emailModel.mail(options, 'employeeonboarding-model/createEnvelope ' + caller)
                        .then(rs => { })
                }
            })
    }

    sendEnvelopeErrorMail(placementTrackerId, templateId, caller) {
        employeeonboardingModel.getCompletedEnvelope(placementTrackerId)
            .then(envDtl => {

                if (envDtl.length) {
                    let fileUrl = 'https://' + config.helloSign.apiKey + ':@api.hellosign.com' + (envDtl[0].fileUrl.replace(/final_copy/g, "files")) + '?file_type=zip';

                    let zipFileUrl = '';

                    if (envDtl[0].employeeDetailsId) {
                        //zipFileUrl = envDtl[0].zipFilePath ? config.portalHostUrl + config.documentBasePath + enums.uploadType.employeeDocs.path + '/' + envDtl[0].employeeDetailsId + '/' + envDtl[0].zipFilePath : '';
                         zipFileUrl = envDtl[0].zipFilePath ? config.documentHostUrl + config.documentBasePath + enums.uploadType.employeeDocs.path + '/' + envDtl[0].employeeDetailsId + '/' + envDtl[0].zipFilePath : '';
                    }
                    else {
                        zipFileUrl = '';
                    }

                    let mailData = [
                        { name: "CandidateFullName", value: envDtl[0].empFirstName + ' ' + envDtl[0].empLastName },
                        { name: "CandidateName", value: envDtl[0].empFirstName },
                        { name: "StepName", value: envDtl[0].envelopeType },
                        { name: "JobTitle", value: envDtl[0].jobTitle },
                        { name: "ClientName", value: envDtl[0].clientName },
                        { name: "CityName", value: envDtl[0].city },
                        { name: "DownloableLink", value: fileUrl },
                        { name: "DOCUMENTURL", value: zipFileUrl },

                    ];
                    let options = {
                        mailTemplateCode: templateId,
                        toMail: [{ mailId: "sharads@compunnel.com", displayName: "Sharad" }],
                        placeHolders: mailData,
                        companyMasterId: envDtl[0].companyMasterId || enums.compnayMaster.default,
                        senderId: envDtl[0].employeeDetailsId || 0
                    };

                    emailModel.mail(options, 'employeeonboarding-model/createEnvelope ' + caller)
                        .then(rs => { })
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
            employeeonboardingModel.getNextSigner(envelopeId)
                .then(rs => {
                    if (rs.length && rs[0].signerSignatureId) {

                        if (!rs[0].isEmployee) {
                            // send mail to other signer e.g. manager
                            employeeonboardingModel.getEnvelopeDetails(rs[0].signerSignatureId)
                                .then(envDtl => {

                                    if (envDtl.length) {
                                        let encKey = commonMethods.encrypt('SIGNERURL||' + rs[0].signerId + '||' + new Date().getTime());

                                        // let signerPage = '/emp-onboarding/managerurl/'+encKey;
                                        let signerPage = encKey;

                                        let mailData = [
                                            { name: "ManagerFullName", value: rs[0].signerName },
                                            { name: "EmployeeFullName", value: envDtl[0].empFirstName },
                                            { name: "StepName", value: envDtl[0].envelopeType },
                                            { name: "JobTitle", value: envDtl[0].jobTitle },
                                            { name: "ClientName", value: envDtl[0].clientName },
                                            { name: "CityName", value: envDtl[0].city },
                                            { name: "On-boardingPage", value: signerPage }
                                        ];

                                        let options = {};
                                        if (envDtl[0].OnboardingRepEmail){
                                            options = {
                                                mailTemplateCode: enums.emailConfig.codes.helloSign.manager,
                                                toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                                ccMail: [{ mailId: envDtl[0].OnboardingRepEmail, displayName: envDtl[0].OnboardingRepFirstName }],
                                                placeHolders: mailData,
                                                replyToEmailid: envDtl[0].OnboardingRepEmail,
                                                companyMasterId: rs[0].companyMasterId || enums.compnayMaster.default,
                                                senderId: rs[0].signerEmployeeDetailsId || 0
                                            };
                                        }else{
                                            options = {
                                                mailTemplateCode: enums.emailConfig.codes.helloSign.manager,
                                                toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                                ccMail: [{ mailId: envDtl[0].hrEmail, displayName: envDtl[0].hrFirstName }],
                                                placeHolders: mailData,
                                                replyToEmailid: envDtl[0].hrEmail,
                                                companyMasterId: rs[0].companyMasterId || enums.compnayMaster.default,
                                                senderId: rs[0].signerEmployeeDetailsId || 0
                                            };
                                        }                                        

                                        if (envDtl[0].consultantType == 1){
                                            if (envDtl[0].vendorEmail){
                                                options.ccMail.push({ mailId: envDtl[0].vendorEmail, displayName: envDtl[0].vendorName })
                                            }
                                        }

                                        emailModel.mail(options, 'employeeonboarding-controller/sendSignatureRequestMail- managermail ')
                                            .then(ml => {
                                                if (ml.isSuccess) {
                                                    response = responseFormat.getResponseMessageByCodes(['success:mailSent']);
                                                    res.status(200).json(response);
                                                }
                                                else {
                                                    response = responseFormat.getResponseMessageByCodes(['errorText:mailnotSent'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            })
                                    }
                                })
                        }
                        else if (rs[0].isEmployee) {
                            // send mail to employee
                            employeeonboardingModel.getEnvDetails(envDtl[0].placementTrackerId)
                                .then(rec => {
                                    if (rec.length) {
                                        let token = commonMethods.encrypt('LOGIN||' + rs[0].employeeDetailsId + '||' + rs[0].signerEmail + '||' + new Date().getTime());

                                        let mailData = [
                                            { name: "RecipientFullName", value: rs[0].signerName },
                                            { name: "SenderSignature", value: rs[0].signerName },
                                            { name: "AutoLoginToken", value: token }
                                        ];
                                        let options = {
                                            mailTemplateCode: enums.emailConfig.codes.helloSign.employee,
                                            toMail: [{ mailId: rs[0].signerEmail, displayName: rs[0].signerName }],
                                            placeHolders: mailData,
                                            ccMail: [{ mailId: rec[0].RecEmail_ID || '', displayName: '' }],
                                            companyMasterId: rs[0].companyMasterId || enums.compnayMaster.default,
                                            senderId: rs[0].employeeDetailsId || 0
                                        };

                                        if (rec[0].Consultant_Type == 1){
                                            if (rec[0].vendorEmail){
                                                options.ccMail.push({ mailId: rec[0].vendorEmail, displayName: rec[0].vendorName })
                                            }
                                        }

                                        emailModel.mail(options, 'employeeonboarding-controller/saveEvents- signature_request_signed employee ')
                                            .then(ml => {
                                                if (ml.isSuccess) {
                                                    response = responseFormat.getResponseMessageByCodes(['success:mailSent']);
                                                    res.status(200).json(response);
                                                }
                                                else {
                                                    response = responseFormat.getResponseMessageByCodes(['errorText:mailnotSent'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            })
                                    }
                                })

                        }
                        else {
                            commonMethods.catchError('employeeonboarding-controller/sendSignatureRequestMail', 'noEmployee')
                            response = responseFormat.getResponseMessageByCodes(['errorText:notSignerFound'], { code: 417 });
                            res.status(200).json(response);
                        }

                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['errorText:notSignerFound'], { code: 417 });
                        res.status(200).json(response);
                    }
                })

        }

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

    updateBenefit(req, res) {
        let authAccessToken = req.headers.authorizationToken;
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId,
            response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            employeeonboardingModel.getOfferLetter(employeeDetailsId,authAccessToken)
                .then(rs => {
                    if (rs.length) {
                        crudOperationModel.updateAll(PtProgressDetails, { benefitsEnvStatus: enums.helloSign.benefitStatus.ni }, { placementTrackerId: rs[0].placementTrackerId })
                            .then(up => {
                                response = responseFormat.getResponseMessageByCodes(['success:saved']);
                                res.status(200).json(response);
                            })
                    }
                    else {
                        // placement tracker not found
                        response = responseFormat.getResponseMessageByCodes(['errorText:noPlacementTracker'], { code: 417 })
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
            crudOperationModel.findModelByCondition(OnBoardingEnvelopes, { onBoardingEnvelopeId: envelopeId })
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

    updateAuthCode(req, res, next) {


        // crudOperationModel.findAllByCondition(EmployeeDetails, {empStatus: 'I', isAccountActivated : 0, employeeDetailsId : req.body.id })
        employeeonboardingModel.authCode()
            .then(users => {
                if (users.length) {
                    async.each(users, function (item, cb) {
                        let encKey = commonMethods.encrypt('SIGNUP||' + item.employeeDetailsId + '||' + item.emailId + '||' + new Date().getTime());
                        let authData = {
                            employeeDetailsId: item.employeeDetailsId,
                            accessTokenKey: encKey,
                            completeUrl: 'https://app.pro.com/account/verify?q=' + encKey,
                            createdDate: new Date()
                        };
                        crudOperationModel.saveModel(EmployeeAccessToken, authData, { employeeDetailsId: 0 })
                            .then(up => {
                                if (up) {
                                    cb();
                                }
                                else {
                                    cb('error saving data')
                                }
                            })
                    }, function (err, result) {
                        if (err) {
                            console.log('err', err)
                        }
                        else {
                            res.status(200).send('updated')
                        }
                    })
                }
            })


    }

    test(req, res) {

        // this.envelopeCompletion('844e57f0b866295011043db23cf1cc7053ac21d1', function(r)
        // {
        //     console.log(r)
        // })

        // console.log(config.portalHostUrl+config.documentBasePath+enums.uploadType.ptDocs.path);

        // employeeonboardingModel.getSignUrl('578df10a8cb71bec49c54f741086d405')
        // .then( rs => {
        //     let signUrl = rs+'&client_id='+config.helloSign.clientId;

        //     res.status(200).send(signUrl)
        // }).catch(err => {
        //    console.log(err)
        // })

        // var options = {
        //     'test_mode' : 1,
        //     'name': ' Pro',
        //     'domain': 'pre.pro.com',
        //     'white_labeling_options' : JSON.stringify({
        //         "legal_version":"terms2",
        //         "text_color2":"#FFFFFF", 
        //         'page_background_color' : '#F7F8F9',
        //         "primary_button_color":"#21A0DA",
        //         "primary_button_text_color":"#ffffff",
        //         "link_color" : "#00B3E6",
        //     })
        // }

        // hellosign.apiApp.update('a7015b87051f5577cf423d6420a0e435', options)
        // .then(function(response){
        //     res.status(200).send(response)
        // })
        // .catch(function(err){
        //     console.log(err)
        // })



        /*
   
        var options1 = {
            test_mode : 1,
            clientId : 'a7015b87051f5577cf423d6420a0e435',
            // template_id : '0dc9e3bac817081413368a51da85006a1de0dce5',
            template_ids : ['a8ae36c57fe9696e6bde647fa44687405d0a8693'],
            subject : 'BG Check',
            message : 'Your Background Check Documents',
            signers : [
                {
                    email_address : 'sharads@compunnel.in',
                    name : 'Sharad',
                    role : 'Candidate',
                    order : 1
                },
                {
                    email_address :'ankur@compunnel.com',
                    name : "ankur",
                    role : "manager",
                    order : 2
                }
            ],
            
        };
        

        hellosign.signatureRequest.createEmbeddedWithTemplate(options)
        .then(function(response){ console.log(response.signature_request.signatures)
            // logger.error(response);
            res.status(200).send(response)
        }).catch(err=> {console.log(err)})
        
        */

    }


    /*callSignUrl_backup(req, res, next)
    {
        let response = responseFormat.createResponseTemplate();
        let employeeDetailsId = req.tokenDecoded ?  req.tokenDecoded.data.employeeDetailsId : 0;
        let self = this;
        
        if(employeeDetailsId > 0)
        { 
            employeeonboardingModel.callSignUrl(employeeDetailsId)
            .then( rs => {  
                if(rs.callSignUrl && rs.createEnvelope)
                {
                    // create new Envelope on hellosign
                    self.createEnvelope(employeeDetailsId, null, function(rs) {
                        res.status(rs.statusCode).json(rs.responseFormat);
                    })
                }
                else if(rs.callSignUrl && !rs.createEnvelope)
                { 
                    // get signUrl from hellosign
                    self.getSignUrl(employeeDetailsId, function(rs1){
                        res.status(rs1.statusCode).json(rs1.responseFormat);
                    })
                }
                else
                {
                    // invalid request send validation message in errorText key
                    response = responseFormat.getResponseMessageByCodes(['errorText:noActiveEnvelope'], {code : 417})
                    res.status(200).json(response);
                }
            })
        }
        else
        {
            response = responseFormat.getResponseMessageByCodes(['errorText:envelopeId'], {code : 417})
            res.status(200).json(response);
        }
    }*/


}