/**
 * -------Import all classes and packages -------------
 */
import lengthValidation from '../editUser/edit-user-length-validation';
import CommonMethods from '../../core/common-methods';
import enums from '../../core/enums';
import fieldsLength from '../../core/fieldsLength';
import _ from 'lodash';

let commonMethods = new CommonMethods();
/**
 *  -------Initialize global variabls-------------
 */
export default class OnboardingValidation {

    basicDetails(reqBody)
    {
        let err = [];

        if ((typeof reqBody.firstName != 'undefined' && reqBody.firstName.trim() == '') || (reqBody.firstName && (reqBody.firstName.length > fieldsLength.users.firstName))) {
            err.push('firstName');
        }
        if ((typeof reqBody.lastName != 'undefined' && reqBody.lastName.trim() == '') || (reqBody.lastName && (reqBody.lastName.length > fieldsLength.users.lastName))) {
            err.push('lastName');
        }

        // if(typeof reqBody.profilePicture != 'undefined' && reqBody.profilePicture == '')
        // {
        //     err.push('profilePicture')
        // }
        
        reqBody.currentJobTitle = reqBody.currentJobTitle ? reqBody.currentJobTitle.trim() : '';
        reqBody.careerProfile = reqBody.careerProfile ? reqBody.careerProfile.trim() : '';

        if ((reqBody.currentJobTitle) && (reqBody.currentJobTitle.length > fieldsLength.users.currentJobTitle)) {
            err.push('currentJobTitle');
        }

        if ((reqBody.totalExpId) && !commonMethods.isValidNumber(reqBody.totalExpId)) {
            err.push('totalExpId');
        }
        
        if ((reqBody.availabilityId) && !(commonMethods.isValidInteger(reqBody.availabilityId))) {
            err.push('availabilityId')
        }
   
        if ((reqBody.authorisationStatusId) && !(commonMethods.isValidInteger(reqBody.authorisationStatusId))) {
            err.push('authorisationStatusId');
        }

        if ((reqBody.jobSearchStatusId) && !(commonMethods.isValidInteger(reqBody.jobSearchStatusId))) {
            err.push('jobSearchStatusId');
        }
        if ((reqBody.contactNumber) && !commonMethods.isValidPhone(reqBody.contactNumber)) {
            err.push('contactNumber');
        }
   
        if (reqBody.careerProfile && reqBody.careerProfile.length > fieldsLength.users.comments) {
            err.push('careerProfile');
        }
        if ((reqBody.industryVerticalId) && !(commonMethods.isValidInteger(reqBody.industryVerticalId))) {
            err.push('industryVerticalId');
        }

        return err;
    }



    editUserValidation(employeeDetailsId, reqBody, resumeVars, documentVars) {
        let err = [];
        
        // let regExp = /^\d[1,18]\.\d[0,2]$/;
        let dateRegEx = /^\d{4}-\d{2}-\d{2}$/;
        let decimalRexged = /^[0-9]+([,.][0-9]+)?$/g;


        if (!employeeDetailsId) {
            err.push('invalidAuthToken');
        }
        if (reqBody.empDetails) 
        {
            if ((reqBody.empDetails.cityId) && !(commonMethods.isValidInteger(reqBody.empDetails.cityId))) {
                err.push('cityId');
            }    
            
        }

        if (reqBody.educations) 
        {
            for(let i=0; i<reqBody.educations.length; i++)
            {
                reqBody.educations[i].qualification = reqBody.educations[i].qualification ? reqBody.educations[i].qualification.trim() : '';
                reqBody.educations[i].institutionName = reqBody.educations[i].institutionName ? reqBody.educations[i].institutionName.trim() : '';

                if ((reqBody.educations[i].employeeEducationId) && !(commonMethods.isValidInteger(reqBody.educations[i].employeeEducationId))) {
                    err.push('employeeEducationId');
                }
                if (!reqBody.educations[i].qualification) {
                    err.push('qualification');
                }
                if (!reqBody.educations[i].institutionName || reqBody.educations[i].institutionName.length > fieldsLength.users.institutionName) {
                    err.push('institutionName');
                }
                if (!reqBody.educations[i].passingYear || !(commonMethods.isValidInteger(reqBody.educations[i].passingYear))) {
                    err.push('passingYear');
                }
            }
            
        }
        if (reqBody.experiences) 
        {
            for(let i=0; i<reqBody.experiences.length; i++)
            {
                reqBody.experiences[i].positionTitle = reqBody.experiences[i].positionTitle ? reqBody.experiences[i].positionTitle.trim() : '';
                reqBody.experiences[i].employerName = reqBody.experiences[i].employerName ? reqBody.experiences[i].employerName.trim() : '';

                if ((reqBody.experiences[i].candidateEmploymentExperienceId) && !(commonMethods.isValidInteger(reqBody.experiences[i].candidateEmploymentExperienceId))) {
                    err.push('candidateEmploymentExperienceId');
                }
                if (!reqBody.experiences[i].positionTitle || reqBody.experiences[i].positionTitle.length > fieldsLength.users.positionTitle) {
                    err.push('positionTitle');
                }
                if (!reqBody.experiences[i].employerName || reqBody.experiences[i].employerName.length > fieldsLength.users.employerName) {
                    err.push('employerName');
                }
                // if (!reqBody.experiences[i].positionResponsibilities) {
                //     err.push('positionResponsibilities');
                // }
                if ((reqBody.experiences[i].positionEndDate) && !commonMethods.isValidDate(reqBody.experiences[i].positionEndDate)) {
                    err.push('positionEndDate:date');
                }
                if (!reqBody.experiences[i].positionStartDate || !commonMethods.isValidDate(reqBody.experiences[i].positionStartDate)) {
                    err.push('positionStartDate:date');
                }
                if((reqBody.experiences[i].positionStartDate && reqBody.experiences[i].positionEndDate) 
                && new Date(reqBody.experiences[i].positionStartDate).getTime() >= new Date(reqBody.experiences[i].positionEndDate).getTime() )
                {
                    err.push('positionStartDate:invalidDateRange')
                }
                // if (!reqBody.experiences[i].countryId || !(commonMethods.isValidInteger(reqBody.experiences[i].countryId))) {
                //     err.push('countryId');
                // }
                
            }
        }
        if (reqBody.documents) {
            let allowExt = reqBody.documents.fileType == 1 ? resumeVars.allowedExt : documentVars.allowedExt;

            if (reqBody.documents.candidateDocId && !(commonMethods.isValidInteger(reqBody.documents.candidateDocId))) {
                err.push('candidateDocId');
            }
            if (!reqBody.documents.fileName || !reqBody.documents.file || !(commonMethods.validateFileType(reqBody.documents.file, reqBody.documents.fileName, allowExt))) {
                err.push('fileName:file');
            }

            if (!reqBody.documents.docName) {
                err.push('docName:docName');
            }


            let types = Object.keys(enums.doc.type).map(item => { return enums.doc.type[item] });

            if (reqBody.documents.fileType == undefined || reqBody.documents.fileType == null || (types.indexOf(~~reqBody.documents.fileType) < 0)) {
                err.push('fileType');
            }
        }

        if (reqBody.licensesAndCertifications) 
        {
            for(let i=0; i<reqBody.licensesAndCertifications.length; i++)
            {
                reqBody.licensesAndCertifications[i].certificateExamName = reqBody.licensesAndCertifications[i].certificateExamName ? reqBody.licensesAndCertifications[i].certificateExamName.trim() : '';

                if (reqBody.licensesAndCertifications[i].empCertificationDetailsId && !(commonMethods.isValidInteger(reqBody.licensesAndCertifications[i].empCertificationDetailsId))) {
                    err.push('empCertificationDetailsId');
                }
                if (!reqBody.licensesAndCertifications[i].certificateExamName || reqBody.licensesAndCertifications[i].certificateExamName.length > fieldsLength.users.certificateExamName) {
                    err.push('certificateExamName');
                }
            }
        }

        if (reqBody.skills) 
        {
            
            let primary = reqBody.skills.filter(itm => { return itm.isPrimary });
            let sks = reqBody.skills.map(itm => { return itm.skillName.toLowerCase() });

            if(sks.some( (item, i) => { return sks.indexOf(item) != i} ))
            {
                err.push('skillName:duplicateSkills')
            }
            
            // if(primary.length < fieldsLength.users.minPrimarySkills)
            // {     
            //     err.push('isPrimary:minNumSkills')
            // }

            if(primary.length > fieldsLength.users.maxPrimarySkills)
            {     
                err.push('isPrimary:numSkills')
            }
            
            for(let i=0; i<reqBody.skills.length; i++)
            {
                reqBody.skills[i].skillName = reqBody.skills[i].skillName ? reqBody.skills[i].skillName.trim() : '';

                if (reqBody.skills[i].candidateSkillId && !(commonMethods.isValidInteger(reqBody.skills[i].candidateSkillId))) {
                    err.push('candidateSkillId')
                }
                if (!reqBody.skills[i].skillName) {
                    err.push('skillName');
                }
                if (!reqBody.skills[i].yearExp || !(commonMethods.isValidNumber(reqBody.skills[i].yearExp))
                || reqBody.skills[i].yearExp == 0  
                || reqBody.skills[i].yearExp > fieldsLength.users.yearsOfExp
                ) {
                    err.push('yearExp');
                }
            }
        }
        if (reqBody.candidateAchievements) {
            if (reqBody.candidateAchievements.candidateAchievementId && !(commonMethods.isValidInteger(reqBody.candidateAchievements.candidateAchievementId))) {
                err.push('candidateAchievementId')
            }

            reqBody.candidateAchievements.description = reqBody.candidateAchievements.description ? reqBody.candidateAchievements.description.trim() : '';

            if (!reqBody.candidateAchievements.description) {
                err.push('description');
            }
        }
        return err;

    }
}