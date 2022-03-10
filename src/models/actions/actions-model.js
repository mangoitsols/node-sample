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


module.exports = {
    signIn: signIn,
    checkEmailExist: checkEmailExist,
    getUserByUserName: getUserByUserName,
    getUserById: getUserById,
    emailActivate: emailActivate,
    getEmailId: getEmailId,
    getCandidateDetails: getCandidateDetails,
    getUserCredentialByGuid: getUserCredentialByGuid,
}