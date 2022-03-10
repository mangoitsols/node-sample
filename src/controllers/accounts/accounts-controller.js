/**
 *  -------Import all classes and packages -------------
 */
import accountModel from '../../models/accounts/accounts-model';
import ProfileManagementModel from '../../models/profileManagement/profile-management-model';
import CrudOperationModel from '../../models/common/crud-operation-model';
import { AccountSignUp } from '../../entities/accounts/account-signup';
import { JobReferral } from '../../entities/jobs/job-referral';
import EmailModel from '../../models/emails/emails-model';
import responseFormat from '../../core/response-format';
import configContainer from '../../config/localhost';
import jwt from 'jsonwebtoken';
import OTPLib from '../../core/otp';
import request from 'request';
import google from 'googleapis';
import logger from '../../core/logger';
import PasswordPolicy from '../../core/pwd-policy';
import CoreUtils from '../../core/core-utils';
import CommonMethods from '../../core/common-methods';
import AccountValidation from '../../validations/accounts/accounts-validation';
import fieldsLength from '../../core/fieldsLength';
import enums from '../../core/enums';
import path from 'path';
import async from 'async';
import fs from 'fs';
import https from 'https';

import { AccountSignIn } from "../../entities/accounts/account-signin";
import { UserLoginDetail } from "../../entities/accounts/user-login-detail";
import { CandidateContact } from "../../entities/jobs/candidate-contact";
import { ResumeMaster } from "../../entities/profileManagement/resume-master";
import { EmployeeDetails } from '../../entities';
import { ClientJobMaster } from "../../entities/jobs/client-job-master";

import ChatModel from '../../models/chat/chat-model';
import { PtPlacementTracker } from "../../entities/employeeonboarding/pt-placementtracker";
import { PtProgressDetails } from "../../entities/employeeonboarding/pt-progress-details";
import { ATS_JobActivity } from "../../entities/jobs/ats-jobactivity";
import { encode } from 'punycode';
import { Buffer } from 'buffer';

/** 
 * -------Initialize global variabls-------------
 */
let OAuth2 = google.auth.OAuth2,
    plus = google.plus('v1'),
    coreUtils = new CoreUtils(),
    config = configContainer.loadConfig(),
    commonMethods = new CommonMethods(),
    crudOperationModel = new CrudOperationModel(),
    profileManagementModel = new ProfileManagementModel(),
    accountValidation = new AccountValidation(),
    chatModel = new ChatModel();

const emailModel = new EmailModel();


class AccountController {

    /**
     * Methods for model validation testing 
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    signUp(req, res, next) {
        req.body.companyGroup = req.body.companyGroup || enums.compnayMaster.default;
        let response = responseFormat.createResponseTemplate(),
            firstName = req.body.firstName,
            lastName = req.body.lastName,
            userDomain = req.body.userDomain,
            email = req.body.email,
            password = req.body.password,
            reCaptchaCode = req.body.reCaptchaCode,
            termsAndConditions = req.body.termsAndConditions,
            resumeFileName = req.body.resumeFileName,
            resumeFile = req.body.resumeFile,
            uid = req.body.uid,
            companyGroup = req.body.companyGroup,
            msgCode = [],
            self = this;

        let resumeVars = enums.uploadType.userResume;
        let newUserInfo = {};

        msgCode = accountValidation.signupValidation(req.body, resumeVars.allowedExt);

        if (msgCode && msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            /**
             * check password policy.
             */
            let pwdPolicy = self.checkPasswordPolicy(password);
            if (!pwdPolicy.isSuccess) {
                response = responseFormat.getResponseMessageByCodes(['password'], { code: 417 });
                res.status(200).json(response);
            }
            else {
                async.waterfall([
                    function (done) {
                        accountModel.checkEmailExist(email)
                            .then((data) => {
                                if (data) {
                                    response = responseFormat.getResponseMessageByCodes(['email:emailExists'], { code: 417 });
                                    res.status(200).json(response);
                                }
                                else {
                                    done();
                                }
                            })
                    },
                    function (done) {
                        if (typeof reCaptchaCode == 'undefined') {
                            done();
                        }
                        else {
                            /**
                             * check catcha validate req.connection.remoteAddress will provide IP address of connected user.
                             */
                            var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret="
                                + config.reCaptcha.secretKey + "&response=" + reCaptchaCode + "&remoteip=" + req.connection.remoteAddress;

                            /**
                             *  Hitting GET request to the URL, Google will respond with success or error scenario.
                             */
                            request(verificationUrl, function (error, response, body) {
                                body = JSON.parse(body);
                                /**
                                 *  Success will be true or false depending upon captcha validation.
                                 */
                                if (body.success !== undefined && !body.success) {
                                    response = responseFormat.getResponseMessageByCodes(['reCaptchaCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                                else {

                                    done();
                                }
                            })
                        }
                    },
                    function (done) {
                        // invitation table entry
                        // if invitation present 
                        if (uid) {
                            commonMethods.decrypt(uid)
                                .then(dec => {
                                    if (dec) {
                                        let userData = dec.split('||');
                                        let referrerInvite = false;

                                        let diffInDays = (new Date().getTime() - userData[3]) / (24 * 60 * 60 * 1000);

                                        // check if user referred job and applying for self reffered job 

                                        if (userData[0] == 'JOBSHAREDBY' && diffInDays <= enums.referValidity) {
                                            crudOperationModel.findModelByCondition(CandidateContact, {
                                                contactEmail: email,
                                                invitationDate: { $ne: null },
                                                status: { $ne: null },
                                            }).then(inv => {
                                                if (inv) {
                                                    // check if invitation if 90 days older 
                                                    let diff = (new Date().getTime() - new Date(inv.invitationDate).getTime()) / (24 * 60 * 60 * 1000);
                                                    if (diff > enums.referValidity) {
                                                        // create invitation by referrer
                                                        referrerInvite = true
                                                    }
                                                }
                                                else {
                                                    //create invitation by referrer
                                                    referrerInvite = true
                                                }

                                                if (referrerInvite) {
                                                    // get referrer resumeId
                                                    crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: userData[1] })
                                                        .then(r => {

                                                            let inviteData = {
                                                                candidateResumeId: r.resumeId,
                                                                contactName: firstName + ' ' + lastName || '',
                                                                contactEmail: email,
                                                                invitationDate: new Date(),
                                                                status: enums.contactStatus.invited,
                                                                createdDate: new Date(),
                                                                isSocialShare: 1,
                                                                jobId: userData[2],
                                                                applicableBonus: enums.sponsoreBonus
                                                            }

                                                            crudOperationModel.saveModel(CandidateContact, inviteData, { candidateResumeId: userData[1], contactEmail: email })
                                                                .then(inv1 => {
                                                                    done()
                                                                })
                                                        })
                                                }
                                                else {
                                                    done()
                                                }
                                            })
                                        }
                                        else {
                                            done()
                                        }
                                    }
                                    else {
                                        done()
                                    }
                                })
                        }
                        else {
                            done()
                        }
                    },
                    function (done) {
                        req.body.empStatus = enums.empStatus.activeStatus;
                        req.body.isAccountActivated = enums.empStatus.inActive;
                        req.body.sourceId = enums.employeeDefaultValues.defaultSourceId;
                        req.body.entityGroup = enums.employeeDefaultValues.defaultEntityGroup;
                        req.body.resumeMasterStatus = enums.resumeMasterStatus.Unverified;
                        req.body.jobSearchStatus = enums.employeeDefaultValues.defaultRefferedJobSearchStatus;
                        /*req.body.companyMasterId = enums.compnayMaster.default;*/
                        req.body.companyMasterId = companyGroup;
                        req.body.userDomain = userDomain == 'y' ? 4653 : 0; // if yes, change before saving, user is from healthcare domain
                        accountModel.signUp(req.body)
                            .then((users) => {
                                if (users && users[0].EmployeeDetails_Id > 0) {

                                    newUserInfo = users[0];
                                    done(null, users);

                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
                                    res.status(400).json(response);
                                }
                            }).catch((error) => {
                                let resp = commonMethods.catchError('accounts-controller/signUp-UserSignUp ', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    },
                    function (user, done) {
                        let encKey = commonMethods.encrypt('SIGNUP||' + user[0].EmployeeDetails_Id + '||' + email + '||' + new Date().getTime());

                        let data = [
                            { name: "USERFIRSTNAME", value: firstName },
                            { name: "USEREMAILID", value: email },
                            { name: "UNIQUECODE", value: encKey }
                        ];
                        let options = {
                            mailTemplateCode: enums.emailConfig.codes.signup.code,
                            toMail: [{ mailId: email, displayName: firstName }],
                            placeHolders: data,
                            replyToEmailid: 'SUPPORTMAILID',
                            companyMasterId: req.body.companyMasterId,
                            senderId: newUserInfo.EmployeeDetails_Id || 0
                        }
                        
                        emailModel.mail(options, 'account-controller/signup')
                            .then(rs => { })

                        done();
                    },
                    function (done) {
                        //===================== add Utm params in DB =====================//
                        commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.userSignup, newUserInfo.EmployeeDetails_Id, newUserInfo.EmployeeDetails_Id, function (rs) { });
                        //================================================================//
                        done();
                    }

                ], function (err, result) {

                    if (err) {
                        if (err == 'resumeFile') {
                            response = responseFormat.getResponseMessageByCodes(['resumeFileName'], { code: 417 });
                            res.status(400).json(response);
                        }
                        else if (err == 'email') {
                            response = responseFormat.getResponseMessageByCodes(['email:emailExists'], { code: 417 });
                            res.status(200).json(response);
                        }
                        else {
                            let resp = commonMethods.catchError('accounts-controller/signUp-saving detail ', error);
                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                            res.status(resp.code).json(response);
                        }
                    }
                    else {
                        let result = {
                            employeeDetailsId: newUserInfo.EmployeeDetails_Id
                        }
                        // response = responseFormat.getResponseMessageByCodes(['success:accountActivatelink']);
                        response = responseFormat.getResponseMessageByCodes('', {
                            content:
                            {
                                dataList: [result],
                                messageList: { success: 'An email with the account activation link has been sent to your email ID.' }
                            }
                        });

                        res.status(200).json(response);
                    }
                });
            }
        }
    }

    /**
     * Get employee details after sign in
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    signIn(req, res, next) {
        let response = responseFormat.createResponseTemplate(),
            userName = req.body.userName,
            password = req.body.password ? req.body.password.replace(/'/g, "''") : '',
            msgCode = [];
        msgCode = accountValidation.signinValidation(req.body);

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } else {
            this.getSignInDetails(userName, password, enums.signInType.normalSignIn)
                .then((resp) => {
                    if (resp.status == 200 && resp.response.code == 200) {
                        let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                        crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                            .then(info => {
                                // update database with device login info
                                commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].emplooyeeDetailsId, 1, function (rs) { });
                                commonMethods.createLoginLog(req.headers, resp.response.content.dataList[0], function (rs) { });

                                //===================== add Utm params in DB =====================//
                                commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.userSignin,
                                    resp.response.content.dataList[0].employeeDetailsId,
                                    resp.response.content.dataList[0].employeeDetailsId, function (rs) { });
                                //================================================================//

                            })
                    }
                    res.status(resp.status).json(resp.response);
                })
        }
    }

    /**
     * Employee sign out
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    signOut(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        if (employeeDetailsId) {
            accountModel.getUserById(employeeDetailsId)
                .then((isUsers) => {
                    if (isUsers) {
                        accountModel.signOut(employeeDetailsId)
                            .then((users) => {

                                // update database with device login info
                                commonMethods.addUserDevice(req.headers, employeeDetailsId, 0, function (rs) { })
                                //===================== add Utm params in DB =====================//
                                commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.userSignout, employeeDetailsId, employeeDetailsId, function (rs) { });
                                //================================================================//

                                response = responseFormat.getResponseMessageByCodes(['success:logOutSuccess']);
                                res.status(200).json(response);

                            }).catch((error) => {
                                let resp = commonMethods.catchError('accounts-controller/signOut', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    } else {
                        response = responseFormat.getResponseMessageByCodes(['invalidAuthToken'], { code: 417 });
                        res.status(200).json(response);
                    }

                }).catch((error) => {
                    let resp = commonMethods.catchError('accounts-controller/signOut', error);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                })

        } else {
            response = responseFormat.getResponseMessageByCodes(['invalidAuthToken'], { code: 417 });
            res.status(200).json(response);
        }

    }


    /**
     * Re-Generate auth key for user before expires
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    routerPostGenerateAuth(req, res, next) {
        let response = responseFormat.createResponseTemplate()
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        if (employeeDetailsId) {
            accountModel.getUserById(employeeDetailsId)
                .then((userDetail) => {
                    if (userDetail) {
                        accountModel.signIn(userDetail.Email_Id, userDetail.password)
                            .then((users) => {
                                if (users && users.length) {
                                    let token = jwt.sign({ data: { employeeDetailsId: users[0].employeeDetailsId } }, config.jwtSecretKey, {
                                        expiresIn: '5d'
                                    });
                                    users[0].userAuthToken = token;
                                    users[0].expiresOn = (new Date().getTime() + 60 * 60 * 120 * 1000);
                                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                    res.status(200).json(response)
                                }
                                else {
                                    let response = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
                                    res.status(200).json(response)
                                }
                            })
                    }
                }).catch(err => {
                    let resp = commonMethods.catchError('accounts-controller/routerPostGenerateAuth', err);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                });
        }
    }



    resetPassword(req, res, next) {
        let response = responseFormat.createResponseTemplate(),
            code = req.body.code,
            newPassword = req.body.newPassword ? req.body.newPassword.replace(/'/g, "''") : '',
            confirmPassword = req.body.confirmPassword,
            msgCode = [];

        msgCode = accountValidation.resetPasswordValidation(req.body);

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } else {

            /**
             * check password policy.
             */
            let pwdPolicy = this.checkPasswordPolicy(newPassword);
            if (!pwdPolicy.isSuccess) {
                response = responseFormat.getResponseMessageByCodes(['newPassword:password'], { code: 417 });
                res.status(200).json(response);
            }
            else {
                commonMethods.decrypt(code)
                    .then(dec => {
                        if (dec) {
                            let userData = dec.split('||');
                            let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                            if (userData[0] == 'PASSWORD' && timeDiff <= enums.activationCodeExpiraionTime) {
                                accountModel.getUserByUserName(userData[2])
                                    .then((data) => {
                                        if (data && data.length) {
                                            accountModel.changePassword({ employeeDetailsId: data[0].EmployeeDetails_Id, newPassword: newPassword })
                                                .then((users) => {

                                                    // let encKey = commonMethods.encrypt('SIGNUP||'+data[0].EmployeeDetails_Id+'||'+data[0].Email_Id+'||'+new Date().getTime());

                                                    let body = [
                                                        { name: "USERFIRSTNAME", value: data[0].First_Name },
                                                        // {name : "USEREMAILID", value : data[0].Email_Id},
                                                        // {name : "UNIQUECODE", value : encKey}
                                                    ];

                                                    let options = {
                                                        mailTemplateCode: enums.emailConfig.codes.passwordChanged.code,
                                                        toMail: [{ mailId: data[0].Email_Id, displayName: data[0].First_Name }],
                                                        placeHolders: body,
                                                        fromName: enums.emailConfig.codes.passwordChanged.fromName,
                                                        replyToEmailid: 'SUPPORTMAILID',
                                                        companyMasterId: data[0].companyMasterId || enums.compnayMaster.default,
                                                        senderId: data[0].EmployeeDetails_Id || 0
                                                    }

                                                    emailModel.mail(options, 'account-controller/resetPassword')
                                                        .then(rs => { })

                                                    this.getSignInDetails(data[0].Email_Id, newPassword, enums.signInType.normalSignIn)
                                                        .then((resp) => {
                                                            if (resp.status == 200 && resp.response.code == 200) {
                                                                let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                                crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                                    .then(info => {
                                                                        // update database with device login info
                                                                        commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { });
                                                                        commonMethods.createLoginLog(req.headers, resp.response.content.dataList[0], function (rs) { });
                                                                    })
                                                            }
                                                            res.status(resp.status).json(resp.response);
                                                        })

                                                }).catch((error) => {
                                                    let resp = commonMethods.catchError('accounts-controller/resetPassword', error);
                                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                    res.status(resp.code).json(response);
                                                })
                                        }
                                        else {
                                            response = responseFormat.getResponseMessageByCodes(['errorText:code'], { code: 417 });
                                            res.status(200).json(response);
                                        }
                                    }).catch((error) => {
                                        let resp = commonMethods.catchError('accounts-controller/resetPassword', error);
                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                        res.status(resp.code).json(response);
                                    })
                            }
                            else {
                                response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                res.status(200).json(response);
                            }
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:code'], { code: 417 });
                            res.status(200).json(response);
                        }


                    })
            }
        }
    }

    /**
     * Crate Passowrd
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    postCreatePassword(req, res, next) {

        let response = responseFormat.createResponseTemplate(),
            msgCode = [],
            reqId = req.body.id,
            reqPassword = req.body.password ? req.body.password.replace(/'/g, "''") : '';


        msgCode = accountValidation.createPasswordValidation(req.body);

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } else {

            let pwdPolicy = this.checkPasswordPolicy(reqPassword);
            if (!pwdPolicy.isSuccess) {
                response = responseFormat.getResponseMessageByCodes(['password:invalidPasswordRules'], { code: 417 });
                res.status(200).json(response);
            } else {

                // let employeeDetailsId = new Buffer.from(reqId.toString(), 'base64').toString('ascii');
                // let employeeDetailsId = commonMethods.decrypt(reqId.toString());

                commonMethods.decrypt(reqId.toString())
                    .then((decryptValue) => {

                        if ((!decryptValue) || isNaN(decryptValue)) {
                            response = responseFormat.getResponseMessageByCodes(['id'], { code: 417 });
                            res.status(200).json(response);
                        } else {
                            let employeeDetailsId = parseInt(decryptValue);
                            accountModel.getUserById(employeeDetailsId)
                                .then((data) => {
                                    if (data) {
                                        if (data.password && data.password != "null") {
                                            response = responseFormat.getResponseMessageByCodes(['password:passwordAlreadyCreated'], { code: 417 });
                                            res.status(200).json(response);
                                        } else {
                                            accountModel.updatePassword(employeeDetailsId, reqPassword)
                                                .then((id) => {
                                                    response = responseFormat.getResponseMessageByCodes(['success:passwordCreatedSuccess']);
                                                    res.status(200).json(response);
                                                })
                                                .catch((error) => {
                                                    let resp = commonMethods.catchError('accounts-controller/updatePassword', error);
                                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                    res.status(resp.code).json(response);
                                                })
                                        }
                                    } else {
                                        response = responseFormat.getResponseMessageByCodes(['id'], { code: 417 });
                                        res.status(200).json(response);
                                    }
                                })
                        }
                    })
                    .catch((error) => {
                        let resp = commonMethods.catchError('accounts-controller/updatePassword', error);
                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                        res.status(resp.code).json(response);
                    })

            }

        }

    }

    /**
     * Change password after login
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    changePassword(req, res, next) {
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        let response = responseFormat.createResponseTemplate(),
            // userName = req.body.userName,
            oldPassword = req.body.oldPassword,
            newPassword = req.body.newPassword ? req.body.newPassword.replace(/'/g, "''") : '',
            confirmPassword = req.body.confirmPassword,
            msgCode = [];
        msgCode = accountValidation.changePasswordValidation(req.body);

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            /**
             * check password policy.
             */
            let pwdPolicy = this.checkPasswordPolicy(newPassword);

            if (!pwdPolicy.isSuccess) {
                response = responseFormat.getResponseMessageByCodes(['newPassword:password'], { code: 417 });
                res.status(200).json(response);
            }
            else {
                accountModel.checkOldPassword({ employeeDetailsId: employeeDetailsId, oldPassword: oldPassword })
                    .then((usersDetails) => {
                        if (usersDetails && usersDetails.length) {
                            accountModel.changePassword({ employeeDetailsId: employeeDetailsId, newPassword: newPassword })
                                .then((users) => {

                                    /**
                                     * send email
                                     */

                                    let body = [
                                        { name: "USERFIRSTNAME", value: usersDetails[0].First_Name }
                                    ];

                                    let options = {
                                        mailTemplateCode: enums.emailConfig.codes.passwordChanged.code,
                                        toMail: [{ mailId: usersDetails[0].Email_Id, displayName: usersDetails[0].First_Name, employeeId: employeeDetailsId }],
                                        placeHolders: body,
                                        fromName: enums.emailConfig.codes.passwordChanged.fromName,
                                        replyToEmailid: 'SUPPORTMAILID',
                                        companyMasterId: usersDetails[0].CompanyMaster_Id || enums.compnayMaster.default,
                                        senderId: employeeDetailsId
                                    };

                                    emailModel.mail(options, 'account-controller/resetPassword')
                                        .then(rs => { })

                                    response = responseFormat.getResponseMessageByCodes(['success:passwordChangedSuccess']);
                                    res.status(200).json(response);

                                }).catch((error) => {
                                    let resp = commonMethods.catchError('accounts-controller/changePassword', error);
                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                    res.status(resp.code).json(response);
                                })
                        } else {
                            response = responseFormat.getResponseMessageByCodes(['oldPassword:invalidOldPassword'], { code: 417 });
                            res.status(200).json(response);
                        }
                    }).catch((error) => {
                        let resp = commonMethods.catchError('accounts-controller/changePassword', error);
                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                        res.status(resp.code).json(response);
                    })
            }
        }
    }


    getProfilePicture(sourceUrl) {
        return new Promise((resolve, reject) => {
            if (!sourceUrl) {
                return resolve({ success: true, message: null })
            }

            let r = request.defaults({ encoding: null });

            r.get(sourceUrl, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let encodedBody = body.toString('base64');
                    let fileName = 'profile.jpg';
                    let pictureVars = enums.uploadType.userPicture;

                    commonMethods.imageProcess(encodedBody)
                        .then(dt => {
                            if (dt.success) {
                                commonMethods.fileUpload(dt.fileData, fileName, pictureVars.docTypeId)
                                    .then((docFileUpload) => {

                                        if (docFileUpload.isSuccess) {
                                            return resolve({ success: true, message: docFileUpload.fileName });
                                        }
                                        else {
                                            return resolve({ success: false, message: docFileUpload.msgCode[0] });
                                        }
                                    }).catch(error => {
                                        return reject(error);
                                    })
                            }
                            else {
                                return reject(dt.error);
                            }
                        });
                }
                else {
                    return resolve({ success: true, message: null })
                }
            })
        })

    }


    loginWithCode(req, res, next) {
        // this is created for login from ATS where user-active check is being removed
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let self = this;

        if (!code) {
            msgCode.push('errorText:code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        crudOperationModel.findAllByCondition(AccountSignIn, { EmployeeDetails_Id: employeeDetailsId, Email_Id: email })
                            .then(rs => {
                                if (rs.length) {
                                    if (userData[0] == 'LOGIN' && timeDiff <= enums.activationCodeExpiraionTime) {
                                        // if(rs[0].emp_status == 'A' && rs[0].isAccountActivated == 1)
                                        // {
                                        // return login details for autologin process
                                        self.getSignInDetailsWithoutPassword(email, enums.signInType.normalSignIn)
                                            .then((resp) => {
                                                if (resp.status == 200 && resp.response.code == 200) {
                                                    let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                    crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                        .then(info => {
                                                            // update database with device login info
                                                            commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { })
                                                        })
                                                }
                                                res.status(resp.status).json(resp.response);
                                            })
                                        // }
                                        // else
                                        // {
                                        //     response = responseFormat.getResponseMessageByCodes(['errorText:inactiveAccount'], { code: 417 });
                                        //     res.status(200).json(response);
                                        // }
                                    }
                                    else {
                                        response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                        res.status(200).json(response);
                                    }

                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }

    mailtrainAccess(req, res, next) {
        // this is created for login from ATS where user-active check is being removed
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let self = this;

        if (!code) {
            msgCode.push('errorText:code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        crudOperationModel.findAllByCondition(AccountSignIn, { EmployeeDetails_Id: employeeDetailsId, Email_Id: email })
                            .then(rs => {
                                if (rs.length) {
                                    if (userData[0] == 'LOGIN' && timeDiff <= enums.activationCodeExpiraionTime) {
                                        // return login details for autologin process
                                        self.getSignInDetails4MailTrainAccess(email, rs[0].password, enums.signInType.normalSignIn)
                                            .then((resp) => {
                                                res.status(resp.status).json(resp.response);
                                            });
                                    }
                                    else {
                                        response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                        res.status(200).json(response);
                                    }
                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }

    passportAccess(req, res, next) {
        // this is created for login from Passport
        let sessionId = req.body.sessionId;
        let appId = req.body.appId;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let self = this;

        if (!sessionId || !appId) {
            msgCode.push('errorText:code');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            let buf = new Buffer.from(sessionId + ':' + appId + ':' + configContainer.thirdPartyPassportApiUrlPrivateKey);
            let base64data = buf.toString('base64');

            request.get({
                headers: { "Authorization": "Basic " + base64data, "content-type": "application/json" },
                url: configContainer.thirdPartyPassportApiUrl,
                timeout: 30000
            }, (error, resp, body) => {
                if (error) {
                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                    res.status(200).json(response);
                } else {
                    if (body.length) {
                        //console.log(body);
                        body = JSON.parse(body);
                        // console.log(body[0]['MailId']);
                        crudOperationModel.findAllByCondition(AccountSignIn, { Email_Id: body[0]['MailId'] })
                            .then(rs => {
                                if (rs.length) {
                                    // return login details for autologin process
                                    self.getSignInDetails4PrivilegeAccess(body[0].MailId, rs[0].password, enums.signInType.normalSignIn)
                                        .then((resp) => {
                                            if (resp.status == 200 && resp.response.code == 200) {
                                                let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                    .then(info => {
                                                        // update database with device login info
                                                        commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { });
                                                        commonMethods.createLoginLog(req.headers, resp.response.content.dataList[0], function (rs) { });
                                                    })
                                            }
                                            res.status(resp.status).json(resp.response);
                                        });
                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    } else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }
                }

            });
        }
    }



    privilegeAccess(req, res, next) {
        // this is created for login from ATS where user-active check is being removed
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let self = this;

        if (!code) {
            msgCode.push('errorText:code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        crudOperationModel.findAllByCondition(AccountSignIn, { EmployeeDetails_Id: employeeDetailsId, Email_Id: email })
                            .then(rs => {
                                if (rs.length) {
                                    if (userData[0] == 'LOGIN' && timeDiff <= enums.activationCodeExpiraionTime) {
                                        // return login details for autologin process
                                        self.getSignInDetails4PrivilegeAccess(email, rs[0].password, enums.signInType.normalSignIn)
                                            .then((resp) => {
                                                if (resp.status == 200 && resp.response.code == 200) {
                                                    let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                    crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                        .then(info => {
                                                            // update database with device login info
                                                            commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { })
                                                        })
                                                }
                                                res.status(resp.status).json(resp.response);
                                            });
                                    }
                                    else {
                                        response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                        res.status(200).json(response);
                                    }
                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }

    /**
     * Common methods for get employee details on signin
     * @param {*} userName : email or employeeDetailsId
     * @param {*} password : account password
     */
    getSignInDetails(userName, password, signinType) {
        let resp = { status: 200, response: responseFormat.createResponseTemplate() },
            isSelfRegisterd = false;
        return accountModel.getUserByUserName(userName)
            .then((isUser) => {
                //console.log(isUser[0].companyMasterId); 
                if (isUser && isUser.length) {                    
                    return accountModel.getCompanyDetailById(config.masterParentCompanyId)
                        .then((companyData) => {
                            if (companyData) {
                                var allowedCompanies = companyData[0].AllowedCompanies.split(',').map(Number);                                
                                if (enums.employeeType.inHouse === isUser[0].EmployeeTypeId) {
                                    // continue. inHouse employee will be always allowed regardless masterCompanyId
                                }else if (config.masterParentCompanyId === isUser[0].companyMasterId) {
                                    // continue. inHouse employee will be always allowed regardless masterCompanyId
                                }else if ( allowedCompanies.indexOf(isUser[0].companyMasterId) < 0 ) {
                                    return accountModel.getCompanyDetailById(isUser[0].companyMasterId)
                                        .then((companyDetails) => {
                                            if (companyDetails) {
                                                resp.response = responseFormat.getResponseMessageByCodes([
                                                    "Signin~Your "+companyDetails[0].CompanyName+" account has a new name. This upgrade will grant you access to all of the existing features and more. No other change is needed on your part.",
                                                    "_action~redirect",
                                                    "_actionValue~" + companyDetails[0].BaseURL
                                                ], { code: 417 });
                                                return resp;
                                            }
                                        })
                                }

                                if (signinType == enums.signInType.normalSignIn && isUser[0].loginAccess == -1) {
                                    resp.response = responseFormat.getResponseMessageByCodes(['deActivateAccount', 'Signin:deActivateAccount'], { code: 417 });
                                    return resp;

                                }
                                else if (signinType == enums.signInType.normalSignIn && isUser[0].isAccountActivated == 0) {
                                    //check user is self registered or not
                                    if (isUser[0].Password && isUser[0].Password != null && isUser[0].Password != "null") {
                                        isSelfRegisterd = true;
                                    }
                                    resp.response = responseFormat.getResponseMessageByCodes(['accountNotActivated'], { code: 417, content: { dataList: [{ isSelfRegisterd: isSelfRegisterd }] } });
                                    return resp;

                                }

                                return accountModel.signIn(userName, password)
                                    .then((users) => {
                                        console.log(userName +" | "+ password);
                                        if (users && users.length) {
                                            let token = jwt.sign({ data: { employeeDetailsId: users[0].employeeDetailsId } }, config.jwtSecretKey, {
                                                expiresIn: '1d'
                                            });
                                            users[0].userAuthToken = token;
                                            users[0].expiresOn = (new Date().getTime() + 60 * 60 * 24 * 1000);

                                            if (users[0].employeeTypeId == enums.employeeType.jobSeeker
                                                || users[0].employeeTypeId == enums.employeeType.consultant) {
                                                //=== if Placement tracker - consultant type is employee or subcontrator then treat them like that
                                                //=== For employeeType jobSeeker abd consultant
                                                return chatModel.getPlacementStatus(users[0].resumeId)
                                                    .then(ptDetail => {
                                                        if (ptDetail) {
                                                            return crudOperationModel.findModelByCondition(PtPlacementTracker, {
                                                                placementTrackerId: ptDetail[0].placementTrackerId
                                                            })
                                                                .then(ptTracker => {
                                                                    if (ptTracker) {

                                                                        return crudOperationModel.findModelByCondition(PtProgressDetails, {
                                                                            placementTrackerId: ptDetail[0].placementTrackerId,
                                                                            placementStatus: { $ne: 2 },
                                                                        })
                                                                            .then(PtProgressDetails => {
                                                                                if (PtProgressDetails) {
                                                                                    //0 = employee and 1 = sun contrator
                                                                                    if (ptTracker.consultantType == 0) {
                                                                                        users[0].employeeTypeId = enums.employeeType.inHouse;
                                                                                        users[0].employeeType = enums.employeeTypeName.inHouse;
                                                                                    }
                                                                                    else if (ptTracker.consultantType == 1) {
                                                                                        users[0].employeeTypeId = enums.employeeType.subContractor;
                                                                                        users[0].employeeType = enums.employeeTypeName.subContractor;
                                                                                    }

                                                                                    resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                                                    return resp;
                                                                                }
                                                                                else {
                                                                                    resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                                                    return resp;
                                                                                }
                                                                            });
                                                                    }
                                                                    else {
                                                                        resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                                        return resp;
                                                                    }
                                                                });
                                                        }
                                                        else {
                                                            resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                            return resp;
                                                        }
                                                    });
                                            }
                                            else {
                                                resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                return resp;
                                            }

                                        }
                                        else {
                                            let responseNormal = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                                            let responseSocial = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
                                            resp.status = (signinType == enums.signInType.normalSignIn) ? 200 : 400;
                                            resp.response = (signinType == enums.signInType.normalSignIn) ? responseNormal : responseSocial;
                                            return resp;
                                        }
                                    })

                            }else{
                                resp.response = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                                return resp;
                            }
                        })

               

                    
                }
                else {
                    resp.response = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                    return resp;
                }
            })

    }


    getSignInDetailsWithoutPassword(userName, signinType) {
        let resp = { status: 200, response: responseFormat.createResponseTemplate() },
            isSelfRegisterd = false;
        return accountModel.getUserByUserName(userName)
            .then((isUser) => {
                if (isUser && isUser.length) {
                    return accountModel.getCompanyDetailById(config.masterParentCompanyId)
                        .then((companyData) => {
                            if (companyData) {
                                var allowedCompanies = companyData[0].AllowedCompanies.split(',').map(Number);                                
                                if (enums.employeeType.inHouse === isUser[0].EmployeeTypeId) {
                                    // continue. inHouse employee will be always allowed regardless masterCompanyId
                                }else if (config.masterParentCompanyId === isUser[0].companyMasterId) {
                                    // continue. inHouse employee will be always allowed regardless masterCompanyId
                                }else if ( allowedCompanies.indexOf(isUser[0].companyMasterId) < 0 ) {
                                    return accountModel.getCompanyDetailById(isUser[0].companyMasterId)
                                        .then((companyDetails) => {
                                            if (companyDetails) {
                                                resp.response = responseFormat.getResponseMessageByCodes([
                                                    "Signin~Your "+companyDetails[0].CompanyName+" account has a new name. This upgrade will grant you access to all of the existing features and more. No other change is needed on your part.",
                                                    "_action~redirect",
                                                    "_actionValue~" + companyDetails[0].BaseURL
                                                ], { code: 417 });
                                                return resp;
                                            }
                                        })
                                }

                                if (signinType == enums.signInType.normalSignIn && isUser[0].loginAccess == -1) {
                                    resp.response = responseFormat.getResponseMessageByCodes(['deActivateAccount', 'Signin:deActivateAccount'], { code: 417 });
                                    return resp;

                                }
                                else if (signinType == enums.signInType.normalSignIn && isUser[0].isAccountActivated == 0) {
                                    //check user is self registered or not
                                    if (isUser[0].Password && isUser[0].Password != null && isUser[0].Password != "null") {
                                        isSelfRegisterd = true;
                                    }
                                    resp.response = responseFormat.getResponseMessageByCodes(['accountNotActivated'], { code: 417, content: { dataList: [{ isSelfRegisterd: isSelfRegisterd }] } });
                                    return resp;

                                }

                                return accountModel.loginWithoutPassword(userName)
                                    .then((users) => {
                                        if (users && users.length) {
                                            let token = jwt.sign({ data: { employeeDetailsId: users[0].employeeDetailsId } }, config.jwtSecretKey, {
                                                expiresIn: '1d'
                                            });
                                            users[0].userAuthToken = token;
                                            users[0].expiresOn = (new Date().getTime() + 60 * 60 * 24 * 1000);

                                            if (users[0].employeeTypeId == enums.employeeType.jobSeeker
                                                || users[0].employeeTypeId == enums.employeeType.consultant) {
                                                //=== if Placement tracker - consultant type is employee or subcontrator then treat them like that
                                                //=== For employeeType jobSeeker abd consultant
                                                return chatModel.getPlacementStatus(users[0].resumeId)
                                                    .then(ptDetail => {
                                                        if (ptDetail) {
                                                            return crudOperationModel.findModelByCondition(PtPlacementTracker, {
                                                                placementTrackerId: ptDetail[0].placementTrackerId
                                                            })
                                                                .then(ptTracker => {
                                                                    if (ptTracker) {

                                                                        return crudOperationModel.findModelByCondition(PtProgressDetails, {
                                                                            placementTrackerId: ptDetail[0].placementTrackerId,
                                                                            placementStatus: { $ne: 2 },
                                                                        })
                                                                            .then(PtProgressDetails => {
                                                                                if (PtProgressDetails) {
                                                                                    //0 = employee and 1 = sun contrator
                                                                                    if (ptTracker.consultantType == 0) {
                                                                                        users[0].employeeTypeId = enums.employeeType.inHouse;
                                                                                        users[0].employeeType = enums.employeeTypeName.inHouse;
                                                                                    }
                                                                                    else if (ptTracker.consultantType == 1) {
                                                                                        users[0].employeeTypeId = enums.employeeType.subContractor;
                                                                                        users[0].employeeType = enums.employeeTypeName.subContractor;
                                                                                    }

                                                                                    resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                                                    return resp;
                                                                                }
                                                                                else {
                                                                                    resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                                                    return resp;
                                                                                }
                                                                            });
                                                                    }
                                                                    else {
                                                                        resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                                        return resp;
                                                                    }
                                                                });
                                                        }
                                                        else {
                                                            resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                            return resp;
                                                        }
                                                    });
                                            }
                                            else {
                                                resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                                return resp;
                                            }

                                        }
                                        else {
                                            let responseNormal = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                                            let responseSocial = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
                                            resp.status = (signinType == enums.signInType.normalSignIn) ? 200 : 400;
                                            resp.response = (signinType == enums.signInType.normalSignIn) ? responseNormal : responseSocial;
                                            return resp;
                                        }
                                    })
                            }else{
                                resp.response = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                                return resp;
                            }

                    })  
                }
                else {
                    resp.response = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                    return resp;
                }
            })

    }

    getSignInDetails4MailTrainAccess(userName, password, signinType) {

        let resp = { status: 200, response: responseFormat.createResponseTemplate() },
            isSelfRegisterd = false;
        return accountModel.getUserByUserName(userName)
            .then((isUser) => {
                if (isUser && isUser.length) {
                    return accountModel.signIn(userName, password)
                        .then((users) => {
                            if (users && users.length) {
                                delete users[0].authorisationStatusId;
                                delete users[0].resumeUploaded;
                                delete users[0].onBoarding;
                                delete users[0].passwordCreated;
                                delete users[0].signupDate;
                                delete users[0].firstLogin;
                                delete users[0].daysOld;
                                delete users[0].guid
                                delete users[0].employeeOnboarding;
                                delete users[0].employeeOnboardingStep;
                                resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                return resp;
                            }
                            else {
                                let responseNormal = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                                let responseSocial = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
                                resp.status = (signinType == enums.signInType.normalSignIn) ? 200 : 400;
                                resp.response = (signinType == enums.signInType.normalSignIn) ? responseNormal : responseSocial;
                                return resp;
                            }
                        })
                }
                else {
                    resp.response = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                    return resp;
                }
            })

    }
    getSignInDetails4PrivilegeAccess(userName, password, signinType) {

        let resp = { status: 200, response: responseFormat.createResponseTemplate() },
            isSelfRegisterd = false;
        return accountModel.getUserByUserName(userName)
            .then((isUser) => {
                if (isUser && isUser.length) {
                    /**
                     * check user is activated
                     */
                    // if (signinType == enums.signInType.normalSignIn && isUser[0].loginAccess == -1) 
                    // {
                    //     resp.response = responseFormat.getResponseMessageByCodes(['Signin:deActivateAccount'], { code: 417 });
                    //     return resp;

                    // }
                    // else if (signinType == enums.signInType.normalSignIn && isUser[0].isAccountActivated == 0) 
                    // {
                    //     //check user is self registered or not
                    //     if (isUser[0].Password && isUser[0].Password != null && isUser[0].Password != "null")
                    //     { 
                    //         isSelfRegisterd = true; 
                    //     }
                    //     resp.response = responseFormat.getResponseMessageByCodes(['accountNotActivated'], { code: 417, content: { dataList: [{ isSelfRegisterd: isSelfRegisterd }] } });
                    //     return resp;

                    // }


                    return accountModel.loginWithoutPassword(userName)
                        .then((users) => {
                            if (users && users.length) {
                                let token = jwt.sign({ data: { employeeDetailsId: users[0].employeeDetailsId } }, config.jwtSecretKey, {
                                    expiresIn: '1d'
                                });
                                users[0].userAuthToken = token;
                                users[0].expiresOn = (new Date().getTime() + 60 * 60 * 24 * 1000);
                                resp.response = responseFormat.getResponseMessageByCodes('', { content: { dataList: users } });
                                return resp;
                            }
                            else {
                                let responseNormal = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                                let responseSocial = responseFormat.getResponseMessageByCodes(['common400'], { code: 400 });
                                resp.status = (signinType == enums.signInType.normalSignIn) ? 200 : 400;
                                resp.response = (signinType == enums.signInType.normalSignIn) ? responseNormal : responseSocial;
                                return resp;
                            }
                        })
                }
                else {
                    resp.response = responseFormat.getResponseMessageByCodes(['Signin:invalidUserNamePassword'], { code: 417 });
                    return resp;
                }
            })

    }

    /**
     * common methods for check password policy.
     * @param {*} password : Account password
     */
    checkPasswordPolicy(password) {

        let passwordPolicy = new PasswordPolicy();
        let msgCode = [],
            returnResp = {
                isSuccess: true,
                response: null,
                messages: []
            }

        let pwdPolicyMsg = passwordPolicy.validate(password);

        if (pwdPolicyMsg.issues && pwdPolicyMsg.issues.length) {
            returnResp.isSuccess = false;

            for (let i = 0; i < pwdPolicyMsg.issues.length; i++) {
                returnResp.messages.push(pwdPolicyMsg.issues[i].reason);
            }

            // returnResp.response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            return returnResp;
        }
        return returnResp;
    }

    /**
     * User account activation after sign up.
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    accountActivate(req, res, next) {
        let response = responseFormat.createResponseTemplate(),
            msgCode = [],
            userName = req.body.userName,
            otpCode = req.body.otpCode;
        msgCode = accountValidation.accountActivate(req.body);
        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            // reqId=reqId.toString();
            accountModel.getUserByUserName(userName)
                .then((data) => {

                    if (data && data.length) {
                        /**
                         * verify otp
                         */
                        accountModel.verifyOTP(data[0].EmployeeDetails_Id, otpCode)
                            .then((success) => {
                                if (success.expire) {
                                    response = responseFormat.getResponseMessageByCodes(['otpCode:otpExpired'], { code: 417 });
                                    res.status(200).json(response);
                                } else if (success.valid) {
                                    if ((data[0].isAccountActivated) && data[0].isAccountActivated == 1) {

                                        this.getSignInDetails(userName, data[0].Password, enums.signInType.normalSignIn)
                                            .then((resp) => {
                                                if (resp.status == 200 && resp.response.code == 200) {
                                                    let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                    crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                        .then(info => {
                                                            // update database with device login info
                                                            commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { })
                                                            // === log activity =====================
                                                            crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: resp.response.content.dataList[0].employeeDetailsId })
                                                                .then(user => {
                                                                    let jobActivity = {
                                                                        candidateId: user.resumeId,
                                                                        clientJobId: "-1",
                                                                        activityLog: " account activated",
                                                                        dataComeFrom: 2,
                                                                        createdOn: new Date(),
                                                                        createdBy: user.employeeDetailsId,
                                                                        activityType: 15353,
                                                                        CompanyMaster_Id: user.companyMasterId || enums.compnayMaster.default
                                                                    }
                                                                    crudOperationModel.saveModel(ATS_JobActivity, jobActivity, { jobactivityId: 0 })
                                                                        .then((rs) => {
                                                                            accountModel.initUpdateTrigger(resp.response.content.dataList[0].employeeDetailsId);
                                                                        })
                                                                });
                                                            // ========================================
                                                        })
                                                }
                                                res.status(resp.status).json(resp.response);
                                            })

                                    } else {
                                        //===================== add Utm params in DB =====================//
                                        commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.accountActivate, data[0].EmployeeDetails_Id, data[0].EmployeeDetails_Id, function (rs) { });
                                        //================================================================//
                                        accountModel.emailActivate(data[0].EmployeeDetails_Id)
                                            .then((id) => {
                                                this.getSignInDetails(userName, data[0].Password, enums.signInType.normalSignIn)
                                                    .then((resp) => {
                                                        if (resp.status == 200 && resp.response.code == 200) {
                                                            let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                            crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                                .then(info => {
                                                                    // update database with device login info
                                                                    commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { })
                                                                    // === log activity =====================
                                                                    crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: resp.response.content.dataList[0].employeeDetailsId })
                                                                        .then(user => {
                                                                            let jobActivity = {
                                                                                candidateId: user.resumeId,
                                                                                clientJobId: "-1",
                                                                                activityLog: "account activated",
                                                                                dataComeFrom: 2,
                                                                                createdOn: new Date(),
                                                                                createdBy: user.employeeDetailsId,
                                                                                activityType: 15353,
                                                                                CompanyMaster_Id: user.companyMasterId || enums.compnayMaster.default
                                                                            }
                                                                            crudOperationModel.saveModel(ATS_JobActivity, jobActivity, { jobactivityId: 0 })
                                                                                .then((rs) => {
                                                                                    accountModel.initUpdateTrigger(resp.response.content.dataList[0].employeeDetailsId);
                                                                                })
                                                                        });
                                                                    // ========================================
                                                                })
                                                        }
                                                        res.status(resp.status).json(resp.response);
                                                    })
                                            })
                                            .catch((error) => {
                                                let resp = commonMethods.catchError('accounts-controller/accountActivate', error);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })
                                    }
                                } else {
                                    response = responseFormat.getResponseMessageByCodes(['otpCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                            .catch((error) => {
                                let resp = commonMethods.catchError('accounts-controller/accountActivate account verification', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    } else {
                        response = responseFormat.getResponseMessageByCodes(['userName'], { code: 417 });
                        res.status(200).json(response);
                    }
                })
        }
    }





    /* Account verification And Activate account and return login data 
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    accountVerifyAndActivate(req, res, next) {
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (!code) {
            msgCode.push('errorText:code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        crudOperationModel.findAllByCondition(AccountSignIn, { EmployeeDetails_Id: employeeDetailsId, Email_Id: email })
                            .then(rs => {
                                if (rs.length) {
                                    //already active check - user will auto login if user is already active
                                    // if (rs[0].emp_status == 'A' && rs[0].isAccountActivated == 1) 
                                    // {
                                    //     response = responseFormat.getResponseMessageByCodes(['alreadyActivated:accountAlreadyActivated'], { code: 417 });
                                    //     res.status(200).json(response);
                                    // }

                                    if ((rs[0].emp_status == 'A' && rs[0].isAccountActivated == 1) ||    //alreay active check
                                        (userData[0] == 'SIGNUP' && timeDiff <= enums.activationCodeExpiraionTime)   //code expiration validity check
                                    ) {
                                        //===================== add Utm params in DB =====================//
                                        commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.accountActivate, employeeDetailsId, employeeDetailsId, function (rs) { });
                                        //================================================================//
                                        accountModel.emailActivate(employeeDetailsId)
                                            .then((success) => {
                                                if (success) {
                                                    // return login details for autologin process
                                                    this.getSignInDetails(email, '', enums.signInType.normalSignIn)
                                                        .then((resp) => {
                                                            if (resp.status == 200 && resp.response.code == 200) {
                                                                let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                                crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                                    .then(info => {
                                                                        // update database with device login info
                                                                        commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { });
                                                                        commonMethods.createLoginLog(req.headers, resp.response.content.dataList[0], function (rs) { });
                                                                        // === log activity =====================
                                                                        crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: resp.response.content.dataList[0].employeeDetailsId })
                                                                            .then(user => {
                                                                                let jobActivity = {
                                                                                    candidateId: user.resumeId,
                                                                                    clientJobId: "-1",
                                                                                    activityLog: "Account activated",
                                                                                    dataComeFrom: 2,
                                                                                    createdOn: new Date(),
                                                                                    createdBy: user.employeeDetailsId,
                                                                                    activityType: 15353,
                                                                                    CompanyMaster_Id: user.companyMasterId || enums.compnayMaster.default
                                                                                }
                                                                                crudOperationModel.saveModel(ATS_JobActivity, jobActivity, { jobactivityId: 0 })
                                                                                    .then((rs) => {
                                                                                        accountModel.initUpdateTrigger(resp.response.content.dataList[0].employeeDetailsId);
                                                                                    })
                                                                            });
                                                                        // ========================================
                                                                    })
                                                            }
                                                            res.status(resp.status).json(resp.response);
                                                        })
                                                }
                                                else {
                                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            })
                                            .catch((error) => {
                                                let resp = commonMethods.catchError('accounts-controller/accountActivate', error);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })
                                    }
                                    else {
                                        response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                        res.status(200).json(response);
                                    }
                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }


    /* Forgot password - Send Activation Link to reset password
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    forgotPassword(req, res, next) {
        let userName = req.body.userName ? req.body.userName.trim() : '';
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (!userName) {
            msgCode.push('userName');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            accountModel.getUserByUserName(userName)
                .then(user => {
                    if (user.length) {
                        if (user[0].UserDisabled == 'y') {
                            msgCode.push('accountDisabled');
                            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
                            res.status(200).json(response);
                        } else {
                            let encKey = commonMethods.encrypt('PASSWORD||' + user[0].EmployeeDetails_Id + '||' + user[0].Email_Id + '||' + new Date().getTime());
                            let data = [
                                { name: "USERFIRSTNAME", value: user[0].First_Name },
                                { name: "USEREMAILID", value: user[0].Email_Id },
                                { name: "UNIQUECODE", value: encKey }
                            ];
                            let options = {
                                mailTemplateCode: enums.emailConfig.codes.forgotPassword.code,
                                toMail: [{ mailId: user[0].Email_Id, displayName: user[0].First_Name }],
                                placeHolders: data,
                                fromName: enums.emailConfig.codes.forgotPassword.fromName,
                                replyToEmailid: 'SUPPORTMAILID',
                                companyMasterId: user[0].companyMasterId || enums.compnayMaster.default,
                                senderId: user[0].EmployeeDetails_Id
                            }

                            emailModel.mail(options, 'account-controller/forgotPassword')
                                .then(rs => { })

                            response = responseFormat.getResponseMessageByCodes(['success:resetPasswordMail']);
                            res.status(200).json(response);
                        }
                    }
                    else {
                        // send email to Non-Registered email Id
                        if (userName && commonMethods.validateEmailid(userName)) {
                            let data = [
                                // {name : "USERFIRSTNAME", value : user[0].First_Name},
                                { name: "USEREMAILID", value: userName },
                                // {name : "UNIQUECODE", value : encKey}
                            ];
                            let options = {
                                mailTemplateCode: enums.emailConfig.codes.forgotPasswordUnreg.code,
                                toMail: [{ mailId: userName, displayName: userName }],
                                placeHolders: data,
                                fromName: enums.emailConfig.codes.forgotPasswordUnreg.fromName,
                                replyToEmailid: 'SUPPORTMAILID',
                                companyMasterId: enums.compnayMaster.default,
                                senderId: 0
                            }

                            emailModel.mail(options, 'account-controller/forgotPassword non-registered')
                                .then(rs => { })
                        }

                        response = responseFormat.getResponseMessageByCodes(['success:resetPasswordMail']);
                        res.status(200).json(response);
                    }
                })
        }
    }

    resendActivationMail(req, res, next) {
        let userName = req.body.userName;
        let code = req.body.code;
        let utmParams = req.body.utmParams || {};
        let jobId = req.body.jobId || 0;

        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            let qString = '';

            if (Object.keys(utmParams).length) {
                for (var i in utmParams) {
                    qString += '&' + i + '=' + utmParams[i]
                }
            }


            if (userName) {
                accountModel.getUserByUserName(userName)
                    .then(user => {
                        if (user.length) {
                            if (user[0].emp_status == 'A' && user[0].isAccountActivated == 1) {
                                response = responseFormat.getResponseMessageByCodes(['userName:accountAlreadyActivated'], { code: 417 });
                                res.status(200).json(response);
                            }
                            else {
                                if (jobId) {
                                    crudOperationModel.findModelByCondition(ClientJobMaster,
                                        {
                                            cjmJobId: jobId,
                                            cjmStatus: 'A'

                                        }).then(jobs => {
                                            if (jobs) {
                                                let encKey = commonMethods.encrypt('SIGNUP||' + user[0].EmployeeDetails_Id + '||' + user[0].Email_Id + '||' + new Date().getTime());
                                                let data = [
                                                    { name: "RECIPIENTFIRSTNAME", value: user[0].First_Name },
                                                    { name: "JOBTITLE", value: jobs.cjmJobTitle },
                                                    { name: "UNIQUECODE", value: encKey }
                                                ];
                                                let options = {
                                                    mailTemplateCode: enums.emailConfig.codes.jobApplyNewUserResendMail.code,
                                                    toMail: [{ mailId: user[0].Email_Id, displayName: user[0].First_Name }],
                                                    placeHolders: data,
                                                    replyToEmailid: 'SUPPORTMAILID',
                                                    companyMasterId: user[0].companyMasterId || enums.compnayMaster.default,
                                                    senderId: user[0].EmployeeDetails_Id || 0
                                                }

                                                emailModel.mail(options, 'account-controller/resendActivationMail')
                                                    .then(rs => { })

                                                let rsp = {
                                                    emailId: user[0].Email_Id
                                                };

                                                response = responseFormat.getResponseMessageByCodes(['success:accountActivatelink'], { content: { dataList: [rsp] } });
                                                res.status(200).json(response);
                                            }
                                            else {
                                                response = responseFormat.getResponseMessageByCodes(['errorText:jobId'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        });


                                } else {
                                    let encKey = commonMethods.encrypt('SIGNUP||' + user[0].EmployeeDetails_Id + '||' + user[0].Email_Id + '||' + new Date().getTime());
                                    let data = [
                                        { name: "USERFIRSTNAME", value: user[0].First_Name },
                                        { name: "USEREMAILID", value: user[0].Email_Id },
                                        { name: "UNIQUECODE", value: encKey }
                                    ];
                                    let options = {
                                        mailTemplateCode: enums.emailConfig.codes.signup.code,
                                        toMail: [{ mailId: user[0].Email_Id, displayName: user[0].First_Name }],
                                        placeHolders: data,
                                        replyToEmailid: 'SUPPORTMAILID',
                                        companyMasterId: user[0].companyMasterId || enums.compnayMaster.default,
                                        senderId: user[0].EmployeeDetails_Id || 0
                                    }

                                    emailModel.mail(options, 'account-controller/resendActivationMail')
                                        .then(rs => { })

                                    let rsp = {
                                        emailId: user[0].Email_Id
                                    };

                                    response = responseFormat.getResponseMessageByCodes(['success:accountActivatelink'], { content: { dataList: [rsp] } });
                                    res.status(200).json(response);
                                }
                            }
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:userName'], { code: 417 });
                            res.status(200).json(response);
                        }
                    })
            }
            else if (code) {
                commonMethods.decrypt(code)
                    .then(dec => {
                        if (dec) {
                            let userData = dec.split('||');
                            let employeeDetailsId = userData[1];
                            let email = userData[2];
                            let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                            accountModel.getUserByUserName(email)
                                .then(user => {
                                    if (user.length) {
                                        if (userData[0] == 'SIGNUP') //&& timeDiff > enums.activationCodeExpiraionTime
                                        {

                                            if (user[0].emp_status == 'A' && user[0].isAccountActivated == 1) {
                                                response = responseFormat.getResponseMessageByCodes(['errorText:accountAlreadyActivated'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                            else {
                                                let encKey = commonMethods.encrypt('SIGNUP||' + user[0].EmployeeDetails_Id + '||' + user[0].Email_Id + '||' + new Date().getTime());
                                                let data = [
                                                    { name: "USERFIRSTNAME", value: user[0].First_Name },
                                                    { name: "USEREMAILID", value: user[0].Email_Id },
                                                    { name: "UNIQUECODE", value: encKey + qString }
                                                ];
                                                let options = {
                                                    mailTemplateCode: enums.emailConfig.codes.signup.code,
                                                    toMail: [{ mailId: user[0].Email_Id, displayName: user[0].First_Name }],
                                                    placeHolders: data,
                                                    replyToEmailid: 'SUPPORTMAILID',
                                                    companyMasterId: user[0].companyMasterId || enums.compnayMaster.default,
                                                    senderId: user[0].EmployeeDetails_Id || 0
                                                }

                                                emailModel.mail(options, 'account-controller/resendActivationMail')
                                                    .then(rs => { })

                                                let rsp = {
                                                    emailId: user[0].Email_Id
                                                };

                                                response = responseFormat.getResponseMessageByCodes(['success:accountActivatelink'], { content: { dataList: [rsp] } });
                                                res.status(200).json(response);

                                            }

                                        }
                                        else if (userData[0] == 'PASSWORD') {
                                            let encKey = commonMethods.encrypt('PASSWORD||' + user[0].EmployeeDetails_Id + '||' + user[0].Email_Id + '||' + new Date().getTime());
                                            let data = [
                                                { name: "USERFIRSTNAME", value: user[0].First_Name },
                                                { name: "USEREMAILID", value: user[0].Email_Id },
                                                { name: "UNIQUECODE", value: encKey }
                                            ];
                                            let options = {
                                                mailTemplateCode: enums.emailConfig.codes.forgotPassword.code,
                                                toMail: [{ mailId: user[0].Email_Id, displayName: user[0].First_Name }],
                                                placeHolders: data,
                                                fromName: enums.emailConfig.codes.forgotPassword.fromName,
                                                replyToEmailid: 'SUPPORTMAILID',
                                                companyMasterId: user[0].companyMasterId || enums.compnayMaster.default,
                                                senderId: user[0].EmployeeDetails_Id || 0
                                            }

                                            emailModel.mail(options, 'account-controller/forgotPassword')
                                                .then(rs => { })

                                            let rsp = {
                                                emailId: user[0].Email_Id
                                            };

                                            response = responseFormat.getResponseMessageByCodes(['success:resetPasswordMail'], { content: { dataList: [rsp] } });
                                            res.status(200).json(response);
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
                                })

                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:invalidCode'], { code: 417 });
                            res.status(200).json(response);
                        }
                    })
            }
            else {
                response = responseFormat.getResponseMessageByCodes(['errorText:codeORusername'], { code: 417 });
                res.status(200).json(response);
            }
        }
    }


    verifyCode(req, res, next) {
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (!code) {
            msgCode.push('code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        if ((userData[0] == 'SIGNUP' || userData[0] == 'PASSWORD') && timeDiff <= enums.activationCodeExpiraionTime) {
                            response = responseFormat.getResponseMessageByCodes(['success:validCode']);
                            res.status(200).json(response);
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['code:expiredCode'], { code: 417 });
                            res.status(200).json(response);
                        }
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['code:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }

    createPassword(req, res, next) {

        let response = responseFormat.createResponseTemplate(),
            employeeDetailsId = req.tokenDecoded.data.employeeDetailsId,
            msgCode = [],
            reqPassword = req.body.password,
            reqConfirmPassword = req.body.confirmPassword;


        if (!reqPassword || reqPassword == '') {
            msgCode.push('password')
        }
        if (!reqConfirmPassword || reqConfirmPassword == '') {
            msgCode.push('confirmPassword')
        }
        else if (reqPassword != reqConfirmPassword) {
            msgCode.push('confirmPassword:passwordMismatch')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {

            let pwdPolicy = this.checkPasswordPolicy(reqPassword);

            if (!pwdPolicy.isSuccess) {
                response = responseFormat.getResponseMessageByCodes(['password'], { code: 417 });
                res.status(200).json(response);
            }
            else {

                accountModel.getUserById(employeeDetailsId)
                    .then((data) => {
                        if (data) {
                            if (data.password && data.password != "null") {
                                response = responseFormat.getResponseMessageByCodes(['password:passwordAlreadyExists'], { code: 417 });
                                res.status(200).json(response);
                            }
                            else {
                                accountModel.updatePassword(employeeDetailsId, reqPassword)
                                    .then((id) => {
                                        response = responseFormat.getResponseMessageByCodes(['success:passwordCreated']);
                                        res.status(200).json(response);
                                    })
                                    .catch((error) => {
                                        let resp = commonMethods.catchError('accounts-controller/updatePassword', error);
                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                        res.status(resp.code).json(response);
                                    })
                            }
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['id'], { code: 417 });
                            res.status(200).json(response);
                        }
                    })

            }

        }

    }

    createCode(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let id = req.body.id;
        let email = req.body.email;
        let type = req.body.type;
        let msgCode = [];

        let typeArr = ['acActivate', 'jobNotLooking', 'login'];

        if (!id || id == '') {
            msgCode.push('id:userId')
        }
        if (!email || email == '') {
            msgCode.push('email')
        }
        if (typeArr.indexOf(type) < 0) {
            msgCode.push('type')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            let encKey = '';
            if (type == 'acActivate') {
                encKey = commonMethods.encrypt('SIGNUP||' + id + '||' + email + '||' + new Date().getTime());
            }
            else if (type == 'jobNotLooking') {
                encKey = commonMethods.encrypt('JOBNOTLOOKING||' + id + '||' + email + '||' + new Date().getTime());
            }
            else if (type == 'login') {
                encKey = commonMethods.encrypt('LOGIN||' + id + '||' + email + '||' + new Date().getTime());
            }

            let data = { code: encKey };
            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [data] } });
            res.status(200).json(response);
        }

    }

    updateUserJobSearchStatus(req, res, next) {
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let month = req.body.month || 3;
        let msgCode = [];

        if (!code) {
            msgCode.push('errorText:code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        crudOperationModel.findAllByCondition(AccountSignIn, { EmployeeDetails_Id: employeeDetailsId, Email_Id: email })
                            .then(rs => {
                                if (rs.length) {

                                    if (timeDiff <= enums.activationCodeExpiraionTime) {
                                        accountModel.updateUserJobSearchStatus(employeeDetailsId, month)
                                            .then((success) => {
                                                if (success) {
                                                    response = responseFormat.getResponseMessageByCodes(['success:jobStatusUpdated']);
                                                    res.status(200).json(response);
                                                }
                                                else {
                                                    response = responseFormat.getResponseMessageByCodes(['invalidCode:notLookingInvalidCode'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            })
                                            .catch((error) => {
                                                let resp = commonMethods.catchError('accounts-controller/accountActivate', error);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })
                                    }
                                    else {
                                        response = responseFormat.getResponseMessageByCodes(['codeExpired:notLookingExpiredCode'], { code: 417 });
                                        res.status(200).json(response);
                                    }

                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['invalidCode:notLookingInvalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['invalidCode:notLookingInvalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }

    updateUserActivelyLooking(req, res, next) {
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (!code) {
            msgCode.push('errorText:code');
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
                        let employeeDetailsId = userData[1];
                        let email = userData[2];

                        crudOperationModel.findAllByCondition(AccountSignIn, { EmployeeDetails_Id: employeeDetailsId, Email_Id: email })
                            .then(rs => {
                                if (rs.length) {
                                    // updateUserActivelyLooking
                                    accountModel.updateUserActivelyLooking(employeeDetailsId)
                                        .then((success) => {
                                            if (success) {
                                                response = responseFormat.getResponseMessageByCodes(['success:jobStatusUpdated']);
                                                res.status(200).json(response);
                                            }
                                            else {
                                                response = responseFormat.getResponseMessageByCodes(['invalidCode:notLookingInvalidCode'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        })
                                        .catch((error) => {
                                            let resp = commonMethods.catchError('accounts-controller/accountActivate', error);
                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                            res.status(resp.code).json(response);
                                        })


                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['invalidCode:notLookingInvalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['invalidCode:notLookingInvalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                })

        }
    }

    notInterestedForJob(req, res, next) {
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let candidateEmail = '';


        if (!code) {
            msgCode.push('errorText:code');
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
                        let jobReferralId = userData[1];
                        let jobId = userData[2];
                        let timeDiff = (new Date().getTime() - userData[3]) / (60 * 60 * 1000);

                        if (userData[0] == 'NOTINTERESTED' && timeDiff <= enums.activationCodeExpiraionTime) {
                            crudOperationModel.findModelByCondition(JobReferral, { jobId: jobId, jobReferralId: jobReferralId })
                                .then(isExist => {
                                    if (isExist) {
                                        //========= verify candidate ==========================//
                                        accountModel.getUserByUserName(isExist.candidateEmail)
                                            .then(user => {

                                                if (user && user.length) {
                                                    //===================== add Utm params in DB =====================//
                                                    commonMethods.addUtmParams(req.headers, enums.utmSaveRequestType.accountActivate, user[0].employeeDetailsId, user[0].employeeDetailsId, function (rs) { });
                                                    //================================================================//
                                                    accountModel.emailActivate(user[0].employeeDetailsId)
                                                        .then((success) => {

                                                        });
                                                }
                                            });
                                        //====================================================//
                                        if (isExist.status > enums.jobReferStatus.referred) {
                                            response = responseFormat.getResponseMessageByCodes(['alreadyTookAction:alreadyTookAction'], { code: 417 });
                                            res.status(200).json(response);
                                        } else {
                                            //======= update not Interested status ================//
                                            let referData = {
                                                status: enums.jobReferStatus.notInterested
                                            }
                                            crudOperationModel.updateAll(JobReferral, referData, { jobId: jobId, jobReferralId: jobReferralId })
                                                .then(rs => {
                                                    response = responseFormat.getResponseMessageByCodes(['success:notInterestedStatusUpdated']);
                                                    res.status(200).json(response);
                                                }).catch(error => {
                                                    let resp = commonMethods.catchError('accounts-controller/notInterestedForJob', error);
                                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                    res.status(resp.code).json(response);
                                                });
                                            //=======================================================//
                                        }
                                    }
                                    else {
                                        let resp = commonMethods.catchError('accounts-controller/notInterestedForJob-isExist', error);
                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                        res.status(resp.code).json(response);
                                    }
                                });
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                            res.status(200).json(response);
                        }
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }

                });

        }
    }

    checkApiUpdate(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [] } });
        res.status(200).json(response);
    }

    loginByGuid(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        // let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId || 0;
        let guid = req.body.guid ? req.body.guid.trim() : '';
        let msgCode = [];

        if (!guid || guid == '') {
            msgCode.push('guid')
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            accountModel.getUserCredentialByGuid(guid)
                .then(rs => {
                    if (rs) {
                        this.getSignInDetails(rs.email, rs.password, enums.signInType.normalSignIn)
                            .then((resp) => {
                                if (resp.status == 200 && resp.response.code == 200) {
                                    let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                    crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                        .then(info => {
                                            // update database with device login info
                                            commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { })
                                        })
                                }
                                res.status(resp.status).json(resp.response);
                            }).catch(err => {
                                response = responseFormat.getResponseMessageByCodes(['guid'], { code: 417 });
                                res.status(200).json(response);
                            })
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['guid'], { code: 417 });
                        res.status(200).json(response);
                    }
                })
        }
    }

    /* Account verification And Activate account and return login data 
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    verifyAndUpdateEmail(req, res, next) {
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let userName;
        let companyMasterId = enums.compnayMaster.default;
        if (!code) {
            msgCode.push('errorText:code');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            commonMethods.decrypt(code)
                .then(dec => {
                    console.log('----dec-----')
                    console.log(dec)
                    if (dec) {
                        let userData = JSON.parse(dec);;
                        let employeeDetailsId = userData.emplyeeDetailId;
                        let exitingEmailId = userData.exitingEmail;
                        let newEmailId = userData.newEmail;
                        let created = userData.created;
                        let action = userData.action;
                        if(action == 'upe'){
                            if ( Math.floor((Math.abs( new Date(new Date()) - new Date( created ) ) / 1000)/ 86400) <=2) {                                
                                async.series([
                                    function (done) {                                       
                                        if (exitingEmailId != newEmailId) {
                                            done();
                                        }else{
                                            response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                            res.status(200).json(response)
                                        }                                           
                                    },
                                    function (done) {
                                        accountModel.getUserByUserName(exitingEmailId)
                                            .then((data) => {
                                                if (data && data.length) {
                                                    done();
                                                }else{
                                                    response = responseFormat.getResponseMessageByCodes(['userName'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            }).catch(err => {
                                                done();
                                            });
                                    },
                                    function (done) {
                                        accountModel.checkEmailExist(newEmailId)
                                            .then((email) => {
                                                if ((!email) || employeeDetailsId == email.EmployeeDetails_Id) {
                                                    done();
                                                }else{
                                                    response = responseFormat.getResponseMessageByCodes(['newEmailId:emailExists'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            }).catch(err => {
                                                done();
                                            });
                                    },
                                    function (done) {
                                        accountModel.checkTemporaryEmailExist(newEmailId)
                                            .then((tempemail) => {
                                                if ((tempemail) || employeeDetailsId == tempemail.EmployeeDetails_Id) {
                                                    userName = tempemail.First_Name;
                                                    companyMasterId = tempemail.CompanyMaster_Id;
                                                    done();
                                                }else{
                                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:emailNotExists'], { code: 417 });
                                                    res.status(200).json(response);
                                                }
                                            }).catch(err => {
                                                done();
                                            });
                                    },
                                    function (done){
                                        accountModel.resetEmailId(newEmailId, employeeDetailsId)
                                            .then((users) => {
                                                done();
                                            }).catch((error) => {
                                                done();
                                            })
                                    },                                    
                                    function (done) {
                                        let data = [
                                            { name: "CURRENTEMAIL", value: newEmailId},
                                            { name: "USERFIRSTNAME", value:userName}
                                        ];
                                        let options = {
                                            mailTemplateCode: enums.emailConfig.codes.changeEmail.verifiedEmail,
                                            toMail: [{ mailId: exitingEmailId, displayName: userName }],
                                            placeHolders: data,
                                            replyToEmailid: 'SUPPORTMAILID',                          
                                            companyMasterId: companyMasterId,
                                            senderId: employeeDetailsId || 0
                                        };
                                        emailModel.mail(options, 'accounts-controller/verifyAndUpdateEmail')
                                            .then(rs => { })
                                        done()
                                    },
                                    function (done) {
                                        let data = [
                                            { name: "CURRENTEMAIL", value: newEmailId},
                                            { name: "USERFIRSTNAME", value:userName}
                                        ];
                                        let options = {
                                            mailTemplateCode: enums.emailConfig.codes.changeEmail.verifiedEmail,
                                            toMail: [{ mailId: newEmailId, displayName: userName }],
                                            placeHolders: data,
                                            replyToEmailid: 'SUPPORTMAILID',                          
                                            companyMasterId: companyMasterId,
                                            senderId: employeeDetailsId || 0
                                        };
                                        emailModel.mail(options, 'accounts-controller/verifyAndUpdateEmail')
                                            .then(rs => { })
                                        done()
                                    },
                                ], function(err, result)
                                {
                                    if (err) {
                                        response = responseFormat.getResponseMessageByCodes(['errorText:'+err], { code: 417 });
                                        res.status(200).json(response);
                                    }else{
                                        response = responseFormat.getResponseMessageByCodes(['success:saved']);
                                        res.status(200).json(response);
                                    }
                                })                                
                            }else{
                                response = responseFormat.getResponseMessageByCodes(['codeExpired:expiredCode'], { code: 417 });
                                res.status(200).json(response);
                            }
                        }else{
                            response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                            res.status(200).json(response);
                        }
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }
                })

        }    
    }

    verifySessionKey(req, res, next) {
        let response = responseFormat.createResponseTemplate();        
        let sessionKey = req.body.key;
        let respData = [];
        if (sessionKey) {
            if (sessionKey.startsWith("|||") ){
                let key = sessionKey.split('|||')[1];;
                commonMethods.decrypt(key)
                .then(dec => {
                    if (dec != false){
                        respData.push({employeeId: dec});
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                        res.status(200).json(response);
                    }else{
                        respData.push({employeeId: null});
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                        res.status(200).json(response);
                    }
                }).catch(error => {
                    respData.push({employeeId: null});
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                    res.status(200).json(response);
                })
            }else{
                let accessToken = new Buffer.from(sessionKey, 'base64').toString('ascii');
                let authToken = accessToken.split(':')[1];
                jwt.verify(authToken, config.jwtSecretKey, function (err, decoded) {
                    if (err) {                       
                        respData.push({employeeId: null});
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                        res.status(200).json(response);
                    }
                    else {                    
                        commonMethods.isUserLoggedIn(decoded.data.employeeDetailsId)
                            .then((isuser) => {
                                if (isuser == 1) {
                                    accountModel.getUserById(decoded.data.employeeDetailsId)
                                        .then((isUsers) => {
                                            if (isUsers) {
                                                respData.push({employeeId: isUsers.EmployeeDetails_Id});
                                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                                res.status(200).json(response)
                                            }
                                            else {                                           
                                                respData.push({employeeId: null});
                                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                                res.status(200).json(response);
                                            }
                                        })
                                }
                                else {
                                    respData.push({employeeId: null});
                                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                    res.status(200).json(response);
                                }
                            })
                            .catch((error) => {
                                respData.push({employeeId: null});
                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                res.status(200).json(response);
                            })
                    }
                });
            }            
        } else {
            respData.push({employeeId: null});
            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
            res.status(200).json(response);
        }
    }

    signinFromPortal(req, res, next) {
        // this is created for login from Passport
        let code = req.body.code;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let self = this;
        console.log('----code-----'+code)
        if (!code) {
            msgCode.push('errorText:code');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {

            var options = {
                method: 'POST',
                url: configContainer.singleSigninApiUrl,
                headers:
                {
                    'Authorization':configContainer.singleSigninApiUrlToken,
                    'content-type':'application/json'
                },
                body: { AuthKey: code },
                json: true,
                timeout: 30000
            };
            request(options, function (error, response, body) {
                
                if (error) {
                    console.log('----error-----')
                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                    res.status(200).json(response);
                } else {
                    console.log('----success-----')
                    console.log('body')
                    console.log(body)
                     console.log(body.content.data.EmailId)
                    if (body.success == true) {
                        crudOperationModel.findAllByCondition(AccountSignIn, { Email_Id: body.content.data.EmailId })
                            .then(rs => {
                                if (rs.length) {
                                    // return login details for autologin process
                                    self.getSignInDetails4PrivilegeAccess(body.content.data.EmailId, rs[0].password, enums.signInType.normalSignIn)
                                        .then((resp) => {
                                            if (resp.status == 200 && resp.response.code == 200) {
                                                let deviceId = (req.headers.deviceId || req.headers.DeviceId || req.headers.Deviceid || req.headers.deviceid);
                                                crudOperationModel.updateAll(UserLoginDetail, { isDeviceLogin: 0 }, { deviceId: deviceId })
                                                    .then(info => {
                                                        // update database with device login info
                                                        commonMethods.addUserDevice(req.headers, resp.response.content.dataList[0].employeeDetailsId, 1, function (rs) { });
                                                        commonMethods.createLoginLog(req.headers, resp.response.content.dataList[0], function (rs) { });
                                                    })
                                            }
                                            res.status(resp.status).json(resp.response);
                                        });
                                }
                                else {
                                    response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                    } else {
                        response = responseFormat.getResponseMessageByCodes(['codeExpired:invalidCode'], { code: 417 });
                        res.status(200).json(response);
                    }
                }
            })
        }
    }


    signinToPortal(req, res, next) {
        let response = responseFormat.createResponseTemplate();        
        let sessionKey = req.body.key;
        let respData = [];
        if (sessionKey) {
            let accessToken = new Buffer.from(sessionKey, 'base64').toString('ascii');
            let authToken = accessToken.split(':')[1];
            jwt.verify(authToken, config.jwtSecretKey, function (err, decoded) {
                if (err) {                       
                    respData.push({employeeId: null});
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                    res.status(200).json(response);
                }
                else {                    
                    commonMethods.isUserLoggedIn(decoded.data.employeeDetailsId)
                        .then((isuser) => {
                            if (isuser == 1) {
                                accountModel.getUserById(decoded.data.employeeDetailsId)
                                    .then((isUsers) => {                                       
                                        if (isUsers) {
                                            //console.log(isUsers)
                                            if (isUsers.Emp_Status == 'A' && isUsers.Login_Access == 1  && isUsers.Employee_Type == enums.employeeType.inHouse){
                                                respData.push({email: isUsers.Email_Id});
                                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                                res.status(200).json(response)
                                            }else{
                                                respData.push({});
                                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                                res.status(200).json(response);
                                            }                                            
                                        }
                                        else {                                           
                                            respData.push({});
                                            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                            res.status(200).json(response);
                                        }
                                    })
                            }
                            else {
                                respData.push({});
                                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                                res.status(200).json(response);
                            }
                        })
                        .catch((error) => {
                            respData.push({});
                            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                            res.status(200).json(response);
                        })
                }
            });           
        } else {
            respData.push({employeeId: null});
            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
            res.status(200).json(response);
        }
    }

    test(req, res) {
        let response = responseFormat.createResponseTemplate();
        let code = req.body.code;
        let type = req.body.type;
        if (type == 'd') {
            commonMethods.decrypt(code)
                .then(dec => {
                    let data = { code: dec };
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [data] } });
                    res.status(200).json(response);
                }).catch(error => {
                    response = responseFormat.getResponseMessageByCodes('Invalid dataaaaa', { code: 417 });
                    res.status(200).json(response);
                })
        } else {
            let enc = commonMethods.encrypt(code)
            let data = { code: enc };
            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [data] } });
            res.status(200).json(response);
        }
    }
}


module.exports = AccountController;