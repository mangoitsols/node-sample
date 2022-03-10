/**
 * -------Import all classes and packages -------------
 */
import lengthValidation from './profile-management-length-validation';
import path from 'path';
import CommonMethods from '../../core/common-methods';
import fieldsLength from '../../core/fieldsLength';

/**
 *  -------Initialize global variabls-------------
 */
export default class ProfileManagementValidation {

    /**
     * validation in edit user profile
     * @param {*} details : data in request body
     * @param {*} employeeDetailsId : logged in employee details id
     */
    editUserValidation(details, employeeDetailsId) {
        let editUserBody = {
            employeeDetailsId: employeeDetailsId,
            firstName: details.firstName,
            lastName: details.lastName,
            currentJobTitle: details.currentJobTitle,
            authorisationStatusId: details.authorisationStatusId,
            contactNumber: details.contactNumber,
            jobSearchStatusId: details.jobSearchStatusId,
            totalExp: details.totalExp,
            totalUsExp: details.totalUsExp,
            address: details.address,
            countryId: details.countryId,
            stateId: details.stateId,
            cityId: details.cityId,
            dob: details.dob,
            otherCity: details.otherCity,
            zipCode: details.zipCode,
            careerProfile: details.careerProfile,
            linkedIn: details.linkedIn,
            twitter: details.twitter,
            facebook: details.facebook,
            skillList: details.skillList,
            licensesList: details.licensesList,
            certificationsList: details.certificationsList,
            educationsList: details.educationsList,
            documentsList: details.documentsList
        },
            err = [];

        if (!editUserBody.employeeDetailsId) {
            err.push('invalidAuthToken');
        }
        if (editUserBody.firstName && editUserBody.firstName != '') {
            if (editUserBody.firstName.length > lengthValidation.lengthValidation('firstNameLength')) {
                err.push('firstName:lengthExceed' + lengthValidation.lengthValidation('firstNameLength'));
            }
        }
        if (editUserBody.lastName && editUserBody.lastName != '') {
            if (editUserBody.lastName.length > lengthValidation.lengthValidation('lastNameLength')) {
                err.push('lastName:lengthExceed' + lengthValidation.lengthValidation('lastNameLength'));
            }
        }

        if ((editUserBody.currentJobTitle) && editUserBody.currentJobTitle.length > lengthValidation.lengthValidation('currentJobTitleLength')) {
            err.push('currentJobTitle:lengthExceed' + lengthValidation.lengthValidation('currentJobTitleLength'));
        }
        if ((editUserBody.authorisationStatusId) && editUserBody.authorisationStatusId != parseInt(editUserBody.authorisationStatusId, lengthValidation.lengthValidation('authorisationStatusIdLength'))) {
            err.push('authorisationStatusId:authorisationStatusIdNotValidInteger');
        }
        if ((editUserBody.contactNumber) && editUserBody.contactNumber.length > lengthValidation.lengthValidation('contactNumberLength')) {
            err.push('contactNumber:lengthExceed' + lengthValidation.lengthValidation('contactNumberLength'));
        }
        if ((editUserBody.jobSearchStatusId) && editUserBody.jobSearchStatusId != parseInt(editUserBody.jobSearchStatusId, lengthValidation.lengthValidation('jobSearchStatusIdLength'))) {
            err.push('jobSearchStatusId:jobSearchStatusIdNotValidInteger');
        }
        if ((editUserBody.totalExp) && editUserBody.totalExp != parseInt(editUserBody.totalExp, lengthValidation.lengthValidation('totalExpLength'))) {
            err.push('totalExp:totalExpNotValidInteger');
        }
        if ((editUserBody.totalUsExp) && editUserBody.totalUsExp != parseInt(editUserBody.totalUsExp, lengthValidation.lengthValidation('totalUsExpLength'))) {
            err.push('totalUsExp:totalUsExpNotValidInteger');
        }
        if ((editUserBody.address) && editUserBody.address.length > lengthValidation.lengthValidation('addressLength')) {
            err.push('address:lengthExceed' + lengthValidation.lengthValidation('addressLength'));
        }
        if ((editUserBody.countryId) && editUserBody.countryId != parseInt(editUserBody.countryId, lengthValidation.lengthValidation('countryIdLength'))) {
            err.push('countryId:countryIdNotValidInteger');
        }
        if ((editUserBody.stateId) && editUserBody.stateId != parseInt(editUserBody.stateId, lengthValidation.lengthValidation('stateIdLength'))) {
            err.push('stateId:stateIdNotValidInteger');
        }
        if ((editUserBody.cityId) && editUserBody.cityId != parseInt(editUserBody.cityId, lengthValidation.lengthValidation('cityIdLength'))) {
            err.push('cityId:cityIdNotValidInteger');
        }
        if (editUserBody.dob && isNaN(Date.parse(editUserBody.dob))) {
            err.push('dob:dobNotValidDate');
        }
        if ((editUserBody.otherCity) && editUserBody.otherCity.length > lengthValidation.lengthValidation('otherCityLength')) {
            err.push('otherCity:lengthExceed' + lengthValidation.lengthValidation('otherCityLength'));
        }
        if ((editUserBody.zipCode) && editUserBody.zipCode.length > lengthValidation.lengthValidation('zipCodeLength')) {
            err.push('zipCode:lengthExceed' + lengthValidation.lengthValidation('zipCodeLength'));
        }
        if ((editUserBody.careerProfile) && editUserBody.careerProfile.length > lengthValidation.lengthValidation('careerProfileLength')) {
            err.push('careerProfile:lengthExceed' + lengthValidation.lengthValidation('careerProfileLength'));
        }
        if ((editUserBody.linkedIn) && editUserBody.linkedIn.length > lengthValidation.lengthValidation('linkedInLength')) {
            err.push('linkedIn:lengthExceed' + lengthValidation.lengthValidation('linkedInLength'));
        }
        if ((editUserBody.twitter) && editUserBody.twitter.length > lengthValidation.lengthValidation('twitterLength')) {
            err.push('twitter:lengthExceed' + lengthValidation.lengthValidation('twitterLength'));
        }
        if ((editUserBody.facebook) && editUserBody.facebook.length > lengthValidation.lengthValidation('facebookLength')) {
            err.push('facebook:lengthExceed' + lengthValidation.lengthValidation('facebookLength'));
        }

        if (editUserBody.skillList && editUserBody.skillList.length) {
            editUserBody.skillList.forEach(function (data) {
                if (!data.action) {
                    err.push('action:skillActionRequired');
                }
                if (!data.employeeSkillDetailsId && (data.action) && (data.action.toLowerCase() != 'c')) {
                    err.push('employeeSkillDetailsId:employeeSkillDetailsIdRequired');
                }
                if (data.employeeSkillDetailsId != parseInt(data.employeeSkillDetailsId, lengthValidation.lengthValidation('employeeSkillDetailsIdLength'))) {
                    err.push('employeeSkillDetailsId:employeeSkillDetailsIdNotValidInteger');
                }
                if ((data.action) && ((data.action.toLowerCase() == 'c') || (data.action.toLowerCase() == 'u'))) {

                    if (!data.skillId) {
                        err.push('skillId:skillIdRequired');
                    } else if (data.skillId != parseInt(data.skillId, lengthValidation.lengthValidation('skillIdLength'))) {
                        err.push('skillId:skillIdNotValidInteger');
                    }
                    if (!data.yearsOfExperience) {
                        err.push('yearsOfExperience:yearsOfExperienceRequired');
                    } else if (data.yearsOfExperience != parseInt(data.yearsOfExperience, lengthValidation.lengthValidation('yearsOfExperienceLength'))) {
                        err.push('yearsOfExperience:yearsOfExperienceNotValidInteger');
                    }
                }
            });
        }

        if (editUserBody.licensesList && editUserBody.licensesList.length) {
            editUserBody.licensesList.forEach(function (data) {
                if (!data.action) {
                    err.push('action:licenseActionRequired');
                }
                if (!data.employeeLicenseId && (data.action) && (data.action.toLowerCase() != 'c')) {
                    err.push('employeeLicenseId:employeeLicenseIdRequired');
                }
                if (data.employeeLicenseId != parseInt(data.employeeLicenseId, lengthValidation.lengthValidation('employeeLicenseIdLength'))) {
                    err.push('employeeLicenseId:employeeLicenseIdNotValidInteger');
                }
                if ((data.action) && ((data.action.toLowerCase() == 'c') || (data.action.toLowerCase() == 'u'))) {
                    if (!data.licenseTypeId) {
                        err.push('licenseTypeId:licenseTypeIdRequired');
                    } else if (data.licenseTypeId != parseInt(data.licenseTypeId, lengthValidation.lengthValidation('licenseTypeIdLength'))) {
                        err.push('licenseTypeId:licenseTypeIdNotValidInteger');
                    }
                    if (!data.registeredStateId) {
                        err.push('registeredStateId:registeredStateIdRequired');
                    } else if (data.registeredStateId != parseInt(data.registeredStateId, lengthValidation.lengthValidation('registeredStateIdLength'))) {
                        err.push('registeredStateId:registeredStateIdNotValidInteger');
                    }
                    if (!data.licenceNumber) {
                        err.push('licenceNumber:licenceNumberRequired');
                    } else if (data.licenceNumber.length > lengthValidation.lengthValidation('licenceNumberLength')) {
                        err.push('licenceNumber:lengthExceed' + lengthValidation.lengthValidation('licenceNumberLength'));
                    }
                    if (!data.expirationDate) {
                        err.push('expirationDate:licenceExpirationDateRequired');
                    } else if (data.expirationDate && isNaN(Date.parse(data.expirationDate))) {
                        err.push('expirationDate:licenceExpirationDateNotValidDate');
                    }
                }
            });
        }

        if (editUserBody.certificationsList && editUserBody.certificationsList.length) {
            editUserBody.certificationsList.forEach(function (data) {

                if (!data.action) {
                    err.push('action:certificationsActionRequired');
                }
                if (!data.empCertificationDetailsId && (data.action) && (data.action.toLowerCase() != 'c')) {
                    err.push('empCertificationDetailsId:empCertificationDetailsIdRequired');
                }
                if (data.empCertificationDetailsId != parseInt(data.empCertificationDetailsId, lengthValidation.lengthValidation('empCertificationDetailsIdLength'))) {
                    err.push('empCertificationDetailsId:empCertificationDetailsIdNotValidInteger');
                }
                if ((data.action) && ((data.action.toLowerCase() == 'c') || (data.action.toLowerCase() == 'u'))) {
                    if (!data.certificateName) {
                        err.push('certificateName:certificateNameRequired');
                    } else if (data.certificateName.length > lengthValidation.lengthValidation('certificateNameLength')) {
                        err.push('certificateName:lengthExceed' + lengthValidation.lengthValidation('certificateNameLength'));
                    }
                    if (!data.issuedBy) {
                        err.push('issuedBy:issuedByRequired');
                    } else if (data.issuedBy.length > lengthValidation.lengthValidation('issuedByLength')) {
                        err.push('issuedBy:lengthExceed' + lengthValidation.lengthValidation('issuedByLength'));
                    }
                    if (!data.expirationDate) {
                        err.push('expirationDate:certificationExpirationDateRequired');
                    } else if (data.expirationDate && isNaN(Date.parse(data.expirationDate))) {
                        err.push('expirationDate:certificationsExpirationDateNotValidDate');
                    }
                }
            });
        }

        if (editUserBody.educationsList && editUserBody.educationsList.length) {
            editUserBody.educationsList.forEach(function (data) {

                if (!data.action) {
                    err.push('action:educationsActionRequired');
                }
                if (!data.employeeEducationId && (data.action) && (data.action.toLowerCase() != 'c')) {
                    err.push('employeeEducationId:employeeEducationIdRequired');
                }
                if (data.employeeEducationId != parseInt(data.employeeEducationId, lengthValidation.lengthValidation('employeeEducationIdLength'))) {
                    err.push('employeeEducationId:employeeEducationIdNotValidInteger');
                }
                if ((data.action) && ((data.action.toLowerCase() == 'c') || (data.action.toLowerCase() == 'u'))) {
                    if (!data.degreeId) {
                        err.push('degreeId:degreeIdRequired');
                    } else if (data.degreeId != parseInt(data.degreeId, lengthValidation.lengthValidation('degreeIdLength'))) {
                        err.push('degreeId:degreeIdNotValidInteger');
                    }
                    if (!data.collegeOrSchool) {
                        err.push('collegeOrSchool:collegeOrSchoolRequired');
                    } else if (data.collegeOrSchool.length > lengthValidation.lengthValidation('collegeOrSchoolLength')) {
                        err.push('collegeOrSchool:lengthExceed' + lengthValidation.lengthValidation('collegeOrSchoolLength'));
                    }
                    if (!data.countryId) {
                        err.push('countryId:educationCountryIdRequired');
                    } else if (data.countryId != parseInt(data.countryId, lengthValidation.lengthValidation('countryIdLength'))) {
                        err.push('countryId:educationCountryIdNotValidInteger');
                    }
                    if (!data.attendedFrom) {
                        err.push('attendedFrom:attendedFromRequired');
                    } else if ((data.attendedFrom.toString().length != lengthValidation.lengthValidation('attendedFromLength')) || data.attendedFrom != parseInt(data.attendedFrom)) {
                        err.push('attendedFrom:notValidYear');
                    }
                    if (!data.attendedTo) {
                        err.push('countryId:attendedToRequired');
                    } else if ((data.attendedTo.toString().length != lengthValidation.lengthValidation('attendedToLength')) || data.attendedTo != parseInt(data.attendedTo)) {
                        err.push('attendedTo:notValidYear');
                    }
                }
            });
        }

        if (editUserBody.documentsList && editUserBody.documentsList.length) {
            editUserBody.documentsList.forEach(function (data) {

                if (!data.action) {
                    err.push('action:documentsActionRequired');
                }
                if (!data.candidateDocId && (data.action) && (data.action.toLowerCase() != 'c')) {
                    err.push('candidateDocId:candidateDocIdRequired');
                }
                if (data.candidateDocId != parseInt(data.candidateDocId, lengthValidation.lengthValidation('candidateDocIdLength'))) {
                    err.push('candidateDocId:candidateDocIdNotValidInteger');
                }
                if ((data.action) && ((data.action.toLowerCase() == 'c') || (data.action.toLowerCase() == 'u'))) {

                    if (!data.fileName) {
                        err.push('fileName:fileNameRequired');
                    } else if (data.fileName.length > lengthValidation.lengthValidation('fileNameLength')) {
                        err.push('fileName:lengthExceed' + lengthValidation.lengthValidation('fileNameLength'));
                    }
                    if (!data.file) {
                        err.push('file:fileRequired');
                    }
                    if (data.fileName) {
                        let ext = (path.extname(data.fileName)) ? ((path.extname(data.fileName)).toLowerCase().trim()) : '';
                        if (!ext) {
                            err.push('fileName:fileNameExtensionRequired');
                        } else if (!((ext == ".txt") || (ext == ".jpg") || (ext == ".jpeg") || (ext == ".gif") || (ext == ".bmp") || (ext == ".png") || (ext == ".doc") || (ext == ".pdf") || (ext == ".docx"))) {
                            err.push('fileName:invalidDocType');
                        }
                    }
                }
            });
        }
        return err;
    }


    /**
    * validations in update email id
    * @param {*} details : data in request body
    */
    resetEmailIdValidation(details) {
        let resetEmailIdBody = {
            userName: details.userName,
            newEmailId: details.newEmailId,
            otpCode: details.otpCode
        }
        let commonMethods = new CommonMethods();
        let err = [];
        if (!resetEmailIdBody.userName || (resetEmailIdBody.userName.length > fieldsLength.users.userName)) {
            err.push('userName');
        }
        if (!resetEmailIdBody.newEmailId || (!commonMethods.validateEmailid(resetEmailIdBody.newEmailId))) {
            err.push('newEmailId:email');
        }
        if (!resetEmailIdBody.otpCode) {
            err.push('otpCode');
        }
        return err;
    }

    /**
* validation in delete users
* @param {*} details : data in request body
*/
    deleteUsersValidation(details) {
        let deleteUsersBody = {
            employeeEducationId: details.employeeEducationId,
            candidateEmploymentExperienceId: details.candidateEmploymentExperienceId,
            candidateDocId: details.candidateDocId,
            employeeLicenseId: details.employeeLicenseId,
            empCertificationDetailsId: details.empCertificationDetailsId,
            candidateSkillId: details.candidateSkillId,
            candidateAchievementId: details.candidateAchievementId,
            socialContactsId: details.socialContactsId

        },
            err = [];

        if ((!deleteUsersBody.employeeEducationId) && (!deleteUsersBody.candidateEmploymentExperienceId) && (!deleteUsersBody.candidateDocId)
            && (!deleteUsersBody.employeeLicenseId) && (!deleteUsersBody.empCertificationDetailsId) &&
            (!deleteUsersBody.candidateSkillId) && (!deleteUsersBody.candidateAchievementId) && (!deleteUsersBody.socialContactsId) ) {
            err.push('error:blankRequest');
        }
        if (deleteUsersBody.employeeEducationId && isNaN(deleteUsersBody.employeeEducationId)) {
            err.push('employeeEducationId');
        }
        if ((deleteUsersBody.candidateEmploymentExperienceId) && isNaN(deleteUsersBody.candidateEmploymentExperienceId)) {
            err.push('candidateEmploymentExperienceId');
        }
        if ((deleteUsersBody.candidateDocId) && isNaN(deleteUsersBody.candidateDocId)) {
            err.push('candidateDocId');
        }
        if ((deleteUsersBody.employeeLicenseId) && isNaN(deleteUsersBody.employeeLicenseId)) {
            err.push('employeeLicenseId');
        }
        if ((deleteUsersBody.empCertificationDetailsId) && isNaN(deleteUsersBody.empCertificationDetailsId)) {
            err.push('empCertificationDetailsId');
        }
        if ((deleteUsersBody.candidateSkillId) && isNaN(deleteUsersBody.candidateSkillId)) {
            err.push('candidateSkillId');
        }
        if ((deleteUsersBody.candidateAchievementId) && isNaN(deleteUsersBody.candidateAchievementId)) {
            err.push('candidateAchievementId');
        }
        if ((deleteUsersBody.socialContactsId) && isNaN(deleteUsersBody.socialContactsId)) {
            err.push('socialContactsId');
        }
        return err;
    }
}
