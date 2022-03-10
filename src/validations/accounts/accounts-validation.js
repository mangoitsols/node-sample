/**
 * -------Import all classes and packages -------------
 */
import CommonMethods from '../../core/common-methods';
import fieldsLength from '../../core/fieldsLength';
import path from 'path';

let commonMethods = new CommonMethods();
/**
 *  -------Initialize global variabls-------------
 */
export default class AccountValidation {

    /**
     * validation in signup section
     * @param {*} details : data in request body
     */
    signupValidation(details, allowedExt) {
        let signupBody = {
            email: details.email,
            firstName: details.firstName,
            lastName: details.lastName,
            userDomain: details.userDomain,
            password: details.password,
            reCaptchaCode: details.reCaptchaCode,
            termsAndConditions: details.termsAndConditions,
            resumeFileName: details.resumeFileName,
            resumeFile: details.resumeFile,
            companyGroup: details.companyGroup
        };
        let err = new Array();
        if (!signupBody.firstName || (signupBody.firstName.length > fieldsLength.accounts.firstName)) {
            err.push('firstName:accFirstName');
        }
        if (!signupBody.lastName || (signupBody.lastName.length > fieldsLength.accounts.lastName)) {
            err.push('lastName:accLastName');
        }
        if (!signupBody.email || !signupBody.email.trim() || (signupBody.email.length > fieldsLength.accounts.email) || (!commonMethods.validateEmailid(signupBody.email))) {
            err.push('email');
        }
        if (!signupBody.userDomain || ['y','n'].indexOf(signupBody.userDomain) === -1) {
            // err.push('userDomain:accUserDomain');
        }
        if (!signupBody.password) {
            err.push('password');
        }
        if(!signupBody.termsAndConditions || !(signupBody.termsAndConditions == true || signupBody.termsAndConditions.toString().toLowerCase() == 'true' || signupBody.termsAndConditions == 1)){
            err.push('termsAndConditions');
        }
        if (typeof signupBody.reCaptchaCode !== undefined && signupBody.reCaptchaCode === "") {
            err.push('reCaptchaCode');
        }
        if ((signupBody.resumeFile && !signupBody.resumeFileName) || (signupBody.resumeFileName && !signupBody.resumeFile)) {
            err.push('resumeFileName');
        }

        if (!signupBody.companyGroup || signupBody.companyGroup == 'na' ) {
            err.push('companyGroup');
        }

        if (signupBody.resumeFileName) {

            if (!commonMethods.validateFileType(signupBody.resumeFile, signupBody.resumeFileName, allowedExt))
            {
                err.push('resumeFileName:file');
            }
        }

       /* if (signupBody.resumeFileName) {
            let ext = (path.extname(signupBody.resumeFileName)) ? ((path.extname(signupBody.resumeFileName)).toLowerCase().trim()) : '';
            if (!ext) {
                err.push('resumeFileName');
            } else if (!((ext == ".txt") || (ext == ".jpg") || (ext == ".jpeg") || (ext == ".gif") || (ext == ".bmp") || (ext == ".png") || (ext == ".doc") || (ext == ".pdf") || (ext == ".docx"))) {
                err.push('resumeFileName');
            }
            // if (signupBody.resumeFile) {
            //     commonMethods.decodeBase64Image(signupBody.resumeFile, path.extname(signupBody.resumeFileName))
            //         .then((data) => {
            //             if (!data.isSuccess) {
            //                 err.push('resumeFileName:invalidDocType');
            //                 
            //             }
            //         })
            // }
        }*/
        return err;
    }

    /**
     * validation in signin 
     * @param {*} details : data in request body
     */
    signinValidation(details) {
        let signinBody = {
            userName: details.userName,
            password: details.password
        }
        let err = [];
        if (!signinBody.userName || !signinBody.password) {
            err.push('Signin:invalidUserNamePassword');
        }

        return err;
    }

    /**
     * validation in signin 
     * @param {*} details : data in request body
     */
    paswwordValidation(details) {
        let signinBody = {
            employeeId: details.employeeId,
            password: details.password
        }
        let err = [];
        if (!signinBody.employeeId || !signinBody.password) {
            err.push('Signin:invalidPassword');
        }

        return err;
    }

    /**
     * validation in reset password
     * @param {*} details : data in request body
     */
    resetPasswordValidation(details) {
        let resetpasswordBody = {
            code: details.code,
            newPassword: details.newPassword,
            confirmPassword: details.confirmPassword
        }
       
        let err = [];
      
        if (!resetpasswordBody.code) {
            err.push('code');
        }
        if (!resetpasswordBody.newPassword) {
            err.push('newPassword:password');
        }
        if (!resetpasswordBody.confirmPassword) {
            err.push('confirmPassword:password');
        }
        else if (resetpasswordBody.newPassword !== resetpasswordBody.confirmPassword) {
            err.push('confirmPassword:passwordMismatch');
        }
        
        return err;
    }

    /**
     * validation in create password
     * @param {*} details : data in request body
     */
    createPasswordValidation(details) {
        let createpasswordBody = {
            reqId: details.id,
            reqPassword: details.password
        }
        let err = [];
        if (!createpasswordBody.reqId) {
            err.push('id');
        }
        if (!createpasswordBody.reqPassword) {
            err.push('password');
        }
        return err;
    }

    /**
     * validation in change password
     * @param {*} details : data in request body
     */
    changePasswordValidation(details) {
        let changepasswordBody = {
            oldPassword: details.oldPassword,
            newPassword: details.newPassword,
            confirmPassword: details.confirmPassword
        },
            err = [];

        if (!changepasswordBody.oldPassword) {
            err.push('oldPassword:password');
        }
        if (!changepasswordBody.newPassword) {
            err.push('newPassword:password');
        } else if (changepasswordBody.oldPassword == changepasswordBody.newPassword) {
            err.push('newPassword:passwordCantBeSame');
        }
        if (!changepasswordBody.confirmPassword) {
            err.push('confirmPassword:password');
        } else if (changepasswordBody.newPassword != changepasswordBody.confirmPassword) {
            err.push('confirmPassword:confirmPasswordNotMatched');
        }
        return err;
    }

    accountActivate(details) {
        let accountActivateBody = {
            userName: details.userName,
            otpCode: details.otpCode
        },
            err = [];

        if (!accountActivateBody.userName) {
            err.push('userName');
        }
        if (!accountActivateBody.otpCode) {
            err.push('otpCode');
        }
        return err;
    }

    /**
 * validation in social signin 
 * @param {*} details : data in request body
 */
    socialSigninValidation(details) {
        let body = {
            accessToken: details.accessToken,
            email: details.email
        }
        let err = [];
        if (!body.accessToken) {
            err.push('accessToken');
        }
        if (!body.email || (!commonMethods.validateEmailid(body.email))) {
            err.push('email');
        }
        return err;
    }
}