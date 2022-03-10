/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from "../../core/db";
import { AccountSignIn } from "../../entities/accounts/account-signin";
import { AccountSignUp } from "../../entities/accounts/account-signup";
import { AccountOTP } from "../../entities/accounts/account-otp";
import OTPLib from "../../core/otp";
import configContainer from "../../config/localhost";
import logger from "../../core/logger";
import enums from "../../core/enums";
import { ResumeMaster } from "../../entities/profileManagement/resume-master";
import path from "path";
import CommonMethods from "../../core/common-methods";
import { Candidate_ResumeAndDoc } from "../../entities/profileManagement/candidate-resume-and-doc";
import { AlertNotificationSetting } from "../../entities/settings/alert-notification-setting";
import UserModel from '../../models/profileManagement/profile-management-model';
import CrudOperationModel from '../../models/common/crud-operation-model';

import request from 'request';
import moment from 'moment';
import { EmployeeDetails } from "../../entities";

/**
 *  -------Initialize global variabls-------------
 */
let config = configContainer.loadConfig(),
    commonMethods = new CommonMethods(),
    crudOperationModel = new CrudOperationModel(),
    userModel = new UserModel();


function getUserById(employeeDetailsId) {

    let query = "EXEC API_SP_usp_GetUserById @employeeDetailsId=" + employeeDetailsId;

    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            if (details.length) {
                return details[0];
            }
            else {
                return false;
            }
        })
        .catch(error => {
            logger.error('Error has occured in account-model/getUserById.', error);
            return [];
        })
}


/**
 * Check Email Exists or not
 * @param {*} email : user emailId
 */
function checkEmailExist(email) {
    return AccountSignIn.findOne({
        where: {
            Email_Id: email
        },
        raw: true
    })
        .then((details) => {
            return details;
        });
}

/**
 * Get Email By EmployeeDetailsID
 * @param {*} employeeDetailsId : user employeeDetailsId
 */

function getEmailId(employeeDetailsId) {
    return AccountSignIn.findOne({
        where: {
            EmployeeDetails_Id: employeeDetailsId
        },
        raw: true
    })
        .then((details) => {
            return [details];
        });
}

/**
 * User sign in
 * @param {*} login : emailId or employeeDetailsId
 * @param {*} password :account password
 */

function signIn(login, password) {
    let query = "EXEC API_SP_UserSignIn @Login=\'" + login + "\', @password=\'" + password + "\' ";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            // check whether employeeonboarding intitated or not
            if (details.length) {
                // -------------------------------
                const uuidv4 = require('uuid/v4');
                let auid = uuidv4(); // store the uuid in database
                let uidQ = 'UPDATE EmployeeDetails SET API_session_uuid = \'' + auid + '\' WHERE EmployeeDetails_Id = ' + details[0].employeeDetailsId;
                dbContext.query(uidQ, { type: dbContext.QueryTypes.update });
                // -------------------------------
                let query1 = "EXEC API_SP_GetCandidateOfferLetter @EmployeeDetails_Id = " + details[0].employeeDetailsId + " ";

                return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                    .then((rs) => {
                        details[0]['employeeOnboarding'] = rs.length ? 1 : 0;
                        details[0]['employeeOnboardingStep'] = rs.length ? (rs[0].isAccepted ? rs[0].envelopeOrder : 0) : 0;
                        return details;
                    })
            }
            else {
                return [];
            }

        })
        .catch(error => {
            logger.error('Error has occured in account-model/signIn.', error);
            return [];
        })
}

/**
 * User sign in without password
 * @param {*} login : emailId or employeeDetailsId
 *
 */
function loginWithoutPassword(login) {
    let query = "EXEC API_SP_UserSignInWithoutPassword @Login=\'" + login + "\'";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            // check whether employeeonboarding intitated or not
            if (details.length) {
                // -------------------------------
                const uuidv4 = require('uuid/v4');
                let auid = uuidv4(); // store the uuid in database
                let uidQ = 'UPDATE EmployeeDetails SET API_session_uuid = \'' + auid + '\' WHERE EmployeeDetails_Id = ' + details[0].employeeDetailsId;
                dbContext.query(uidQ, { type: dbContext.QueryTypes.update });
                // -------------------------------
                let query1 = "EXEC API_SP_GetCandidateOfferLetter @EmployeeDetails_Id = " + details[0].employeeDetailsId + " ";

                return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                    .then((rs) => {
                        details[0]['employeeOnboarding'] = rs.length ? 1 : 0;
                        details[0]['employeeOnboardingStep'] = rs.length ? (rs[0].isAccepted ? rs[0].envelopeOrder : 0) : 0;
                        return details;
                    })
            }
            else {
                return [];
            }

        })
        .catch(error => {
            logger.error('Error has occured in account-model/signIn.', error);
            return [];
        })
}

/**
 * User sign Up
 * @param {*} reqData : data of request body
 */
function signUp(reqData) {
    let query = "EXEC API_SP_UserSignUp  "
        + " @FirstName=:firstName"
        + ",@LastName=:lastName"
        + ",@EmailId=:email"
        + ",@Password=:password"
        + ",@empStatus=:empStatus"
        + ",@isAccountActivated=:isAccountActivated"
        + ",@recruiter=:recruiter"
        + ",@phone=:phone"
        + ",@phoneCode=:phoneCode"
        + ",@sourceId=:sourceId"
        + ",@entityGroup=:entityGroup"
        + ",@JobSearchStatus=:jobSearchStatus"
        + ",@ProfilePicture=:profilePicture"
        + ",@resumeMasterStatus=:resumeMasterStatus"
        + ",@companyMasterId=:companyMasterId"
        + ",@userDomain=:userDomain"
        + ",@subSource=13304"
    return dbContext.query(query, {
        replacements:
        {
            firstName: reqData.firstName,
            lastName: reqData.lastName,
            email: reqData.email,
            password: reqData.password,
            empStatus: reqData.empStatus,
            isAccountActivated: reqData.isAccountActivated,
            recruiter: (reqData.recruiter || enums.employeeDefaultValues.defaultRecruiter),
            phone: (reqData.phone) ? reqData.phone : '',
            phoneCode: (reqData.phoneCode) ? reqData.phoneCode : '',
            sourceId: (reqData.sourceId || enums.employeeDefaultValues.defaultSourceId),
            entityGroup: (reqData.entityGroup || enums.employeeDefaultValues.defaultEntityGroup),
            jobSearchStatus: ((reqData.jobSearchStatus || null)),
            profilePicture: ((reqData.profilePicture || null)),
            resumeMasterStatus: ((reqData.resumeMasterStatus || enums.resumeMasterStatus.Unverified)),
            userDomain: reqData.userDomain,
            companyMasterId: ((reqData.companyMasterId || enums.compnayMaster.default))
        },
        type: dbContext.QueryTypes.SELECT
    })
        .then((details) => {

            // save data for resume search
            // let reqBody = {}; reqBody.empDetails = reqData;
            // reqBody.employeeDetailsId = details ? details[0].EmployeeDetails_Id : 0;
            // userModel.resumeSearch(reqBody)
            //     .then(data => {
            //         // console.log(data);
            //     })
            //     .catch(error => {
            //        // console.log(error);
            //     })

            return details;
        });
}

/**
 * Get Resume Id by EmployeeDetailsId
 * @param {*} employeeDetailsId : employeeDetailsId
 */
function getResumeIdbyEmployeeId(employeeDetailsId) {
    return ResumeMaster.findOne({
        where: {
            FromEmployeeDetails_Id: employeeDetailsId
        },
        raw: true
    })
        .then((details) => {
            return details;
        })
}



/**
 * 
 * @param {*} employeeDetailsId : employeeDetailsId
 * @param {*} documentList : Resume Uploaded
 */
function updateResume(employeeDetailsId, documentList) {
    let response = {};
    documentList.forEach(function (data) {
        let candidateDocId = data.candidateDocId,
            action = data.action.toLowerCase(),
            newObj = {
                resumeId: data.resumeId,
                filePath: data.filePath,
                fileName: data.fileName,
                docType: enums.doc.type.resume,
                modifiedBy: employeeDetailsId,
                modifiedDate: new Date()
            };

        newObj.createdBy = employeeDetailsId;
        newObj.createdDate = new Date();
        return Candidate_ResumeAndDoc.create(newObj)
            .then((det) => {
                response.isSuccess = true;
                return response;
            })
            .catch((error) => {
                logger.error("Error has occured in profile-management-model/updateResume process.", error);
                response.msgCode = "errorDocumentsSave";
                response.isSuccess = false;
                return response;
            });
    })
}


/**
 * Upload Resume on uploadResume
 * @param {*} resumeId : resumeId
 */
function uploadResume(resumeId, details, employeeDetailsId) {

    return new Promise((resolve, reject) => {


        let newList = [];
        let commonMethods = new CommonMethods();

        // let folderName = "/profile",
        //     timestamp = new Date().getTime(),
        //     filePath = "",

        let response = {};
        let resumeFile = details.resumeFile,
            resumeFileName = details.resumeFileName;

        let ext = commonMethods.getIncomingFileExtension(resumeFile);
        let resumeVars = enums.uploadType.userResume;

        // let extension = (path.extname(resumeFileName)).toLowerCase().trim();
        // let fileNameWithoutExtension = (resumeFileName.slice(0, -(extension.length))).replace(/[^a-z0-9$\-_.+!*"(),]/gi, "");
        // filePath = folderName + "/" + fileNameWithoutExtension + "_" + timestamp + extension;

        if (resumeVars.allowedExt.indexOf(ext) < 0) {
            return resolve(response.isSuccess = false);
        }
        else {

            return commonMethods.fileUpload(resumeFile, resumeFileName, resumeVars.docTypeId, null, null, employeeDetailsId)
                .then((fileUpload) => {
                    if (!fileUpload.isSuccess) {
                        response.isSuccess = fileUpload.isSuccess;
                        response.msgCode = fileUpload.msgCode;
                    }
                    newList.push({
                        resumeId: resumeId,
                        filePath: filePath,
                        fileName: resumeFileName,
                        docType: 1,
                        createdBy: employeeDetailsId,
                        createdDate: new Date(),
                        modifiedBy: employeeDetailsId,
                        modifiedDate: new Date(),
                        action: 'c'
                    });
                    let res = updateResume(employeeDetailsId, newList);
                    return resolve(res);
                })
        }

    })


}

/**
 * User GetCompanyDetailById
 * @param {*} id : CompanyMaster id
 */
function getCompanyDetailById(companyMasterId) {
    let query = "EXEC API_SLP_GetCompanyDetailById @masterCompanyId=\'" + companyMasterId + "\'";
    console.log('-------getCompanyDetailById-------')
    console.log(query)
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            return details;
        });
}

/**
 * User sign Out
 * @param {*} id : logged in employee details id
 */
function signOut(id) {
    let query = "EXEC API_SP_UserSignOut @EmployeeDetails_Id=\'" + id + "\'";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            return details;
        });
}

/**
 * Check old password exists or not
 * @param {*} reqData : data of request body
 */
function checkOldPassword(reqData) {
    let query = "EXEC API_S_uspAccounts_CheckOldPassword @employeeDetailsId=\'" + reqData.employeeDetailsId + "\', @Password=\'" + reqData.oldPassword + "\' ";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            return details;
        });
}

/**
 * Change password
 * @param {*} reqData : data of request body
 */
function changePassword(reqData) {
    return crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: reqData.employeeDetailsId, isAccountActivated: enums.empStatus.active })
        .then(rs => {
            let query = '';
            if (rs) {
                query = "EXEC API_S_uspAccounts_UserChangePassword @employeeDetailsId=\'" + reqData.employeeDetailsId + "\', @Password=\'" + reqData.newPassword + "\', @empStatus=\'" + enums.empStatus.activeStatus + "\', @isAccountActivated=\'" + enums.empStatus.active + "\', @accountActivationDate= " + null + " ";
            } else {
                query = "EXEC API_S_uspAccounts_UserChangePassword @employeeDetailsId=\'" + reqData.employeeDetailsId + "\', @Password=\'" + reqData.newPassword + "\', @empStatus=\'" + enums.empStatus.activeStatus + "\', @isAccountActivated=\'" + enums.empStatus.active + "\', @accountActivationDate=\'" + moment(new Date()).format('YYYY-MM-DD hh:mm:ss') + "\' ";
            }
            return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((details) => {
                    return details;
                });
        });
}

/**
 * Get User By User Name
 * @param {*} userName : emailId or employeeDetailsId
 */
function getUserByUserName(userName) {
    let query = "EXEC API_SP_GetUserByUserName @UserName=\'" + userName + "\' ";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((details) => {
            return details;
        }).
        catch(error => {
            logger.error('Error has occured in account-model/signIn getSignInDetails process.', error);
            return [];
        });
}




/**
 * Generate otp
 * @param {*} employeeDetailsId : logged in employee details id
 */
/*function createOTP(employeeDetailsId) {
    let otplib = new OTPLib(),
        { secret, token } = otplib.generateOTP(),
        time = new Date();
    time.setMinutes(time.getMinutes() + config.otpExpireDuration);
    let obj = {
        EmployeeDetails_Id: employeeDetailsId,
        Secret_Key: secret,
        Token: token,
        Expiry: time,
        IsActive: true
    }

    return new Promise((resolve, reject) => {
        AccountOTP.findOne({
            where: [{ EmployeeDetails_Id: employeeDetailsId }],
            raw: true
        })
            .then((emp) => {
                if (emp) {
                    AccountOTP.update(obj, { where: [{ EmployeeDetails_Id: employeeDetailsId }] })
                        .then((data) => {
                            resolve(obj.Token);
                        })
                        .catch((error) => {
                            logger.error('Error has occured in account-modle/createOTP.', error);
                            reject(null);
                        })

                } else {
                    AccountOTP.create(obj)
                        .then((data) => {
                            resolve(obj.Token);
                        })
                        .catch((error) => {
                            logger.error('Error has occured in account-modle/createOTP.', error);
                            reject(null);
                        })
                }
            })
    })

}*/


/*function updateAccountOtp(employeeDetailsId) {
    return new Promise((resolve, reject) => {
        AccountOTP.update({ IsActive: false },
            { where: [{ EmployeeDetails_Id: employeeDetailsId }] }
        )
            .then((response) => {
                resolve({ isUpDate: true })
            })
            .catch((error) => {
                logger.error('Error has occured in account-modle/updateAccountOtp.', error);
                reject({ isUpDate: false })
            })
    });

}*/

/**
 * verify otp
 * @param {*} employeeDetailsId : logged in employee details id
 * @param {*} token : validation token
 */
function verifyOTP(employeeDetailsId, token) {
    let response = { valid: false, expire: false };
    return AccountOTP.findOne({
        where: [{ EmployeeDetails_Id: employeeDetailsId }, { Token: token }, { IsActive: true }],
        raw: true
    })
        .then((otp) => {
            if (otp) {
                let currentDate = new Date(),
                    expiryDate = new Date(otp.Expiry);

                if (expiryDate > currentDate) {

                    let isValid = (otp.Token == token);
                    return updateAccountOtp(employeeDetailsId)
                        .then((res) => {
                            response = { valid: isValid, expire: false };
                            return response;
                        })
                        .catch((error) => {
                            logger.error('Error has occured in account-controller/verifyOTP.', error);
                            return response;
                        })

                } else {
                    response = { valid: false, expire: true };
                    return response;
                }
            } else {
                response = { valid: true, expire: true };
                return response;
            }
        })
        .catch((error) => {
            logger.error('Error has occured in account-controller/verifyOTP.', error);
            return response;
        });
}


/**
 * Email Activation
 * @param {*} employeeDetailsId : logged in employee details id
 */
function emailActivate(employeeDetailsId) {
    let response = {},
        newObj = {
            emp_status: 'A',
            isAccountActivated: 1,
            AccountActivation_Date: new Date()
        };
    return AccountSignIn.update(newObj,
        {
            where:
            {
                EmployeeDetails_Id: employeeDetailsId
            }
        }
    )
        .then((det) => {
            response.isSuccess = true;
            return response;
        })
        .catch((error) => {
            logger.error("Error has occured in accounts-model/emailActivate update process.", error);
            response.msgCode = "emailActivate";
            response.isSuccess = false;
            return response;
        });
}


/**
 * update password
 * @param {*} employeeDetailsId : logged in employee details id
 * @param {*} password : account password
 */
function activateUserAfterSocialLogin(employeeDetailsId) {
    let response = {},
        newObj = {
            password: null,
            emp_status: 'A',
            isAccountActivated: 1,
            AccountActivation_Date: new Date()
        };
    return AccountSignIn.update(newObj,
        {
            where:
            {
                EmployeeDetails_Id: employeeDetailsId
            }
        }
    )
        .then((det) => {
            response.isSuccess = true;
            return response;
        })
        .catch((error) => {
            logger.error("Error has occured in accounts-model/activateUserAfterSocialLogin.", error);
            response.msgCode = "emailActivate";
            response.isSuccess = false;
            return response;
        });
}


/**
 * activate user and blank password in case of social login with in active email id
 * @param {*} employeeDetailsId : logged in employee details id
 */
function updatePassword(employeeDetailsId, password) {
    let response = {};
    let query = "update EmployeeDetails set Password = dbo.ufn_EncryptPassword('"+password+"') where EmployeeDetails_Id = "+employeeDetailsId;
    return dbContext.query(query, {
        type: dbContext.QueryTypes.SELECT
    })
    .then((details) => {
        response.isSuccess = true;
        return response;
        
    })
    .catch((error) => {
        logger.error("Error has occured in accounts-model/emailActivate update process.", error);
        response.msgCode = "emailActivate";
        response.isSuccess = false;
        return response;
    });
}

/**
 * Resume Parsing
 * @param {*} req : HTTP request argument
 * @param {*} res : HTTP response argument
 * @param {*} next : Callback argument
 */

function parseResume(candidateId, resumeName, resumeFile, calledFrom, resumeObj) {
    let response = {};
    return new Promise(function (resolve, reject) {
        // check for CheckConfirm == null then call Resume-Parsing API
        crudOperationModel.findAllByCondition(ResumeMaster, { resumeId: candidateId })
            .then(rs => {
                if (rs.length && typeof rs[0].checkConfirm == "number") {
                    return resolve({ isSuccess: true });
                }

                let encodedBody = new Buffer.from(
                    JSON.stringify({
                        candidateId: candidateId,
                        fileName: resumeName,
                        companyMasterId: rs[0].CompanyMaster_Id,
                        encodedData: resumeFile
                    })
                ).toString('base64');

                var options = {
                    method: 'POST',
                    url: config.thirdPartyResumeParaseUrl,
                    body: { data: encodedBody },
                    timeout: 30000,
                    json: true
                };

                request(options, function (error, resp, body) {
                    if (error || (body.message && body.message.trim().toLowerCase() !== 'success')) {
                        let msg = 'Error has occurred in ' + calledFrom + ' in Parse-Resume API. ';
                        msg += resumeObj && resumeObj.emailId ? '<br> Candidate Email : ' + resumeObj.emailId : '';
                        msg += resumeObj && resumeObj.firstName ? '<br> Candidate Name : ' + resumeObj.firstName + ' ' + resumeObj.lastName : '';
                        msg += '<br>';

                        let messageBody = body.message;
                        if (error) {
                            error = error + ' <br> Encoded Resume : ' + resumeFile;
                        } else {
                            messageBody = messageBody + ' <br> Encoded Resume : ' + resumeFile;
                        }
                        commonMethods.catchError(msg, (error || messageBody));
                        response.isSuccess = false;
                        response.message = body.message;
                        return resolve(response);
                    }
                    else {
                        // update status of resume Unverified in Resume_Master
                        crudOperationModel.saveModel(ResumeMaster, { status: enums.resumeMasterStatus.Unverified }, { resumeId: candidateId })
                            .then(rs => {
                                response.candidateId = body.candidateId;
                                response.isSuccess = true;
                                return resolve(response);

                            })

                    }

                });

            });

    });
}

function updateUserJobSearchStatus(employeeDetailsId, month) {
    return new Promise(resolve => {

        crudOperationModel.saveModel(ResumeMaster,
            {
                jobSearchStatusId: enums.referred.notLookingForOpportunity,
                availableDate: moment(new Date()).add(month, 'M')
            },
            { employeeDetailsId: employeeDetailsId })
            .then(rs => {
                crudOperationModel.saveModel(AlertNotificationSetting,
                    {
                        employeeDetailsId: employeeDetailsId,
                        alertTypeId: enums.alertAndNotification.type.matchingJob,
                        alertStatus: 0,
                        switchOffStatus: 1,
                        dateTo: moment(new Date()).add(month, 'M'),
                        createdBy: employeeDetailsId,
                        createdDate: new Date(),
                        // modifiedBy : employeeDetailsId,
                        // modifiedDate : new Date()
                    },
                    {
                        employeeDetailsId: employeeDetailsId,
                        alertTypeId: enums.alertAndNotification.type.matchingJob
                    })
                    .then(rs1 => {
                        return resolve(rs1);
                    })
            })

    })
}

function initUpdateTrigger(employeeDetailsId) {
    crudOperationModel.saveModel(ResumeMaster,
        {
            modifiedBy: employeeDetailsId
        },
        { employeeDetailsId: employeeDetailsId })
}

function updateUserActivelyLooking(employeeDetailsId) {
    return new Promise(resolve => {

        crudOperationModel.saveModel(ResumeMaster,
            {
                jobSearchStatusId: enums.referred.activelyLookingStatus,
                availableDate: moment(new Date())
            },
            { employeeDetailsId: employeeDetailsId })
            .then(rs => {
                crudOperationModel.saveModel(AlertNotificationSetting,
                    {
                        employeeDetailsId: employeeDetailsId,
                        alertTypeId: enums.alertAndNotification.type.matchingJob,
                        alertFrequencyId: null,
                        alertStatus: 1,
                        switchOffStatus: null,
                        dateTo: moment(new Date()),
                        createdBy: employeeDetailsId,
                        createdDate: new Date(),
                        dateFrom: null,
                        dateTo: null
                        // modifiedBy : employeeDetailsId,
                        // modifiedDate : new Date()
                    },
                    {
                        employeeDetailsId: employeeDetailsId,
                        alertTypeId: enums.alertAndNotification.type.matchingJob
                    })
                    .then(rs1 => {
                        return resolve(rs1);
                    })
            })

    })
}

function getCandidateDetails(employeeDetailsId) {
    let query = "EXEC API_SP_GetUserProfileById @EmployeeDetails_Id=\'" + employeeDetailsId + "\'";

    return new Promise((resolve, reject) => {

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((det) => {

                let query = "EXEC API_SP_GetSkillsByEmployeeDetId @EmployeeDetails_Id=\'" + employeeDetailsId + "\'";
                return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                    .then((details) => {

                        let emp = det[0];

                        let employment = emp.desiredEmployement ? (emp.desiredEmployement.split("|").map(item => { return item.trim() ? enums.desiredEmployement[item].val : '' })) : [];
                        emp.desiredEmployement = employment;
                        emp['skills'] = details.map(sk => { return sk.skillName }).join(', ');
                        return resolve(emp);
                    })

            })
    })
}

function getUserCredentialByGuid(guid) {
    let query = "EXEC API_SP_GetUserCredentialbyGuid @guid=\'" + guid + "\'";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((rs) => {
            return rs.length ? rs[0] : '';
        }).catch(err => {
            return '';
        })
}

/**
 * Check Email Exists or not
 * @param {*} email : user emailId
 */
function checkTemporaryEmailExist(email) {
    return AccountSignIn.findOne({
        where: {
            temporaryEmail: email
        },
        raw: true
    })
        .then((details) => {
            return details;
        });
}

/**
 * reset email id
 * @param {*} newEmailId : new email id
 * @param {*} employeeDetailsId : logged in employee details id
 */
function resetEmailId(newEmailId, employeeDetailsId) {
    let response = {};
    let query = "EXEC API_SP_ResetPrimaryEmailId @Email_Id=\'" + newEmailId + "\', @EmployeeDetails_Id=\'" + employeeDetailsId + "\' ";
    return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
        .then((det) => {
            response.isSuccess = true;
            return response;
        })
        .catch((error) => {
            logger.error("Error has occured in profile-management-model/resetEmail process.", error);
            response.isSuccess = false;
            return response;
        });
}

module.exports = {
    signIn: signIn,
    loginWithoutPassword: loginWithoutPassword,
    signUp: signUp,
    signOut: signOut,
    checkOldPassword: checkOldPassword,
    changePassword: changePassword,
    checkEmailExist: checkEmailExist,
    getUserByUserName: getUserByUserName,
    // createOTP: createOTP,
    verifyOTP: verifyOTP,
    getUserById: getUserById,
    emailActivate: emailActivate,
    updatePassword: updatePassword,
    getEmailId: getEmailId,
    getResumeIdbyEmployeeId: getResumeIdbyEmployeeId,
    uploadResume: uploadResume,
    activateUserAfterSocialLogin: activateUserAfterSocialLogin,
    parseResume: parseResume,
    updateUserJobSearchStatus: updateUserJobSearchStatus,
    updateUserActivelyLooking: updateUserActivelyLooking,
    getCandidateDetails: getCandidateDetails,
    getUserCredentialByGuid: getUserCredentialByGuid,
    initUpdateTrigger: initUpdateTrigger,
    checkTemporaryEmailExist:checkTemporaryEmailExist,
    resetEmailId:resetEmailId,
    getCompanyDetailById:getCompanyDetailById
}