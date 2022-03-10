/**
 *  -------Import all classes and packages -------------
 */

// call models
import accountModel from '../../models/accounts/accounts-model';
import UserModel from '../../models/profileManagement/profile-management-model';
import SkillDetailsModel from '../../models/profileManagement/employee-skill-details-model';
import EducationDetailsModel from '../../models/profileManagement/employee-education-details-model';
import CrudOperationModel from '../../models/common/crud-operation-model';
import CandidateEmploymentExperienceModel from '../../models/profileManagement/candidate-employment-experience-model';
import EmailModel from '../../models/emails/emails-model';
import TimecardsModel from '../../models/timecards/timecards-model';
import JobsModel from '../../models/jobs/jobs-model'
import MyprojectsModel from '../../models/myProjects/my-projects-model'

// call all entities 
import {
    EmployeeSkillDetails, EmployeeEducationDetails, CandidateEmploymentExperience, Candidate_ResumeAndDoc, ResumeEducationDataType,
    EmployeeLicense, EmployeeCertificationDetails, CandidateAchievement, EmployeeDetails, ResumeMaster, EmployeeContactDetails, CandidateSkills, CityList
} from "../../entities/index";
import { CandidateReferral } from '../../entities/referrals/candidate-referral';
import { ProjectDetails } from '../../entities/myProjects/project-details';

import responseFormat from '../../core/response-format';
import configContainer from '../../config/localhost';
import logger from '../../core/logger';
import redis from '../../core/redis-client';
import enums from '../../core/enums';
import CommonMethods from '../../core/common-methods';
import moment from 'moment';
import lodash from 'lodash';
import Q from 'q';
import async from 'async';
import path from 'path';
import ProfileManagementValidation from '../../validations/profileManagement/profile-management-validation';
import EditUserValidation from '../../validations/editUser/edit-user-validation.js';
import OnboardingValidation from '../../validations/onboarding/onboarding-validation.js';

import fieldsLength from '../../core/fieldsLength';

/**
 *  -------Initialize global variabls-------------
 */
const REDIS_LOOKUPS_KEY = 'profileLookup';
let userModel = new UserModel(),
    config = configContainer.loadConfig(),
    profileManagementValidation = new ProfileManagementValidation(),
    skillDetailsModel = new SkillDetailsModel(),
    educationDetailsModel = new EducationDetailsModel(),
    crudOperationModel = new CrudOperationModel(),
    candidateEmploymentExperienceModel = new CandidateEmploymentExperienceModel(),
    editUserValidation = new EditUserValidation(),
    onboardingValidation = new OnboardingValidation(),
    commonMethods = new CommonMethods(),
    jobsModel = new JobsModel(),
    myprojectsModel = new MyprojectsModel();

const emailModel = new EmailModel();

export default class OnboardingController {

    constructor() {
        //
    }

   /**
   * Manage Educations
   * @param {*} employeeDetailsId : logged in user id
   * @param {*} educations :educations object
   */
    manageEducations(employeeDetailsId, educations, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };
        let resumeId = 0;
        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster, {employeeDetailsId: ~~employeeDetailsId})
                .then((resume) => { 
                    if (resume) 
                    {   
                        resumeId = resume.resumeId;
                        done();
                    }
                    else
                    {
                        resp.statusCode = 200;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(['employeeEducationId'], { code: 417 });
                        next(resp);
                    }
                })
               
            },
            function (done) {
                async.map(educations, function (item, cb) {
                    item.resumeId = resumeId;    
                    item.passingYear = new Date(item.passingYear, 1, 1);               
                    crudOperationModel.saveModel(ResumeEducationDataType, item, { employeeEducationId: (item.employeeEducationId || 0) })
                        .then((result) => {
                            cb(null, result)
                        })

                }, function (err, rss) {
                    if (!err) {
                        done();
                    }
                    else {
                        done(err);
                    }
                })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('onboarding-controller/editUser EmployeeEducationDetails series process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                resp.statusCode = 200;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                next(resp);
            }
        })

    }

    /**
  * Manage experiences
  * @param {*} employeeDetailsId : logged in user id
  * @param {*} experiences :experiences object
  */
    manageExperiences(employeeDetailsId, experiences, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        let resumeId = 0;
        // return new Promise((resolve, reject) => {
        //check id exists or not

        let condition = { candidateEmploymentExperienceId: 0 };

        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: ~~employeeDetailsId })
                .then((resume) => {
                    if (resume) {
                        resumeId = resume.resumeId;
                        done();
                    }
                    else {
                        resp.statusCode = 200;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateEmploymentExperienceId'], { code: 417 });
                        next(resp);
                    }
                })

            },
            function (done) {
                async.map(experiences, function (item, cb) {
                    item.employeeDetailsId = employeeDetailsId;
                    item.resumeId = resumeId;
                    item.createdBy = employeeDetailsId;
                    item.positionEndDate = (!item.positionEndDate) ? null : item.positionEndDate;
                    item.modifiedBy = item.candidateEmploymentExperienceId ? employeeDetailsId : null;
                    item.modifiedDate = item.candidateEmploymentExperienceId ? new Date().toISOString() : null;
                    crudOperationModel.saveModel(CandidateEmploymentExperience, item, { candidateEmploymentExperienceId: (item.candidateEmploymentExperienceId || 0) })
                        .then((result) => {
                            cb(null, result)
                        })

                }, function (err, rss) {
                    if (!err) {
                        done();
                    }
                    else {
                        done(err);
                    }
                })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('onboarding-controller/editUser manageExperiences process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                resp.statusCode = 200;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                next(resp);
            }
        })

    }


    /**
     * Manage documents
     * @param {*} employeeDetailsId : logged in user id
     * @param {*} documents :documents object
     */
    manageDocuments(employeeDetailsId, documents, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        },
            self = this,
            resumeId = 0;

        let file = documents.file;
        let fileName = documents.fileName;
        let resumeVars = enums.uploadType.userResume;
        let documentVars = enums.uploadType.userDocument;

        let condition = { candidateDocId: 0 };


        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster,
                    {
                        employeeDetailsId: ~~employeeDetailsId
                    })
                    .then((resume) => {
                        if (resume) {
                            resumeId = resume.resumeId;
                            if (documents.candidateDocId != undefined && documents.candidateDocId > 0) {
                                crudOperationModel.findModelByCondition(Candidate_ResumeAndDoc,
                                    {
                                        candidateDocId: ~~documents.candidateDocId,
                                        resumeId: ~~resume.resumeId
                                    })
                                    .then((details) => {
                                        if (details) {
                                            documents.modifiedBy = employeeDetailsId;
                                            documents.modifiedDate = new Date();
                                            condition = { candidateDocId: documents.candidateDocId };
                                            done();
                                        }
                                        else {
                                            resp.statusCode = 200;
                                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateDocId'], { code: 417 });
                                            next(resp);
                                        }
                                    })
                            }
                            else {
                                documents.createdBy = employeeDetailsId;
                                documents.createdDate = new Date();
                                done();
                            }
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateDocId'], { code: 417 });
                            next(resp);
                        }
                    })

            },

            function (done) {

                let docType = documents.fileType == 1 ? resumeVars.docTypeId : documentVars.docTypeId;

                commonMethods.fileUpload(file, fileName, docType, null, null, employeeDetailsId)
                    .then((docFileUpload) => {
                        if (docFileUpload.isSuccess) {
                            documents.filePath = docFileUpload.fileName;
                            documents.docType = documents.fileType;
                            documents.resumeId = resumeId;
                            documents.fileName = documents.docName;
                            crudOperationModel.saveModel(Candidate_ResumeAndDoc, documents, condition)
                                .then((result) => {
                                    if (result) {
                                        resp.statusCode = 200;
                                        resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                                    }
                                    else {
                                        let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.');
                                        resp.statusCode = response.code;
                                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                                        next(resp);
                                    }
                                    next(resp);
                                })
                                .catch((error) => {
                                    let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.', error);
                                    resp.statusCode = response.code;
                                    resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                                    next(resp);
                                })


                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['fileName:' + docFileUpload.msgCode[0]], { code: 417 });
                            next(resp);
                        }
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })

            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                next(rs);
            }
        })
    }

    /**
    * Manage licenses
    * @param {*} employeeDetailsId : logged in user id
    * @param {*} licenses :licenses object
    */
    manageLicenses(employeeDetailsId, licenses, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        let condition = { employeeLicenseId: 0 };
        licenses.employeeDetailsId = employeeDetailsId;

        async.series([
            function (done) {
                if (licenses.employeeLicenseId != undefined && licenses.employeeLicenseId > 0) {
                    //check id exists or not
                    crudOperationModel.findModelByCondition(EmployeeLicense,
                        {
                            employeeLicenseId: ~~licenses.employeeLicenseId,
                            employeeDetailsId: ~~employeeDetailsId
                        })
                        .then((details) => {
                            if (details) {
                                licenses.modifiedBy = employeeDetailsId;
                                licenses.modifiedDate = new Date();
                                condition = { employeeLicenseId: licenses.employeeLicenseId };
                                done();
                            } else {
                                resp.statusCode = 200;
                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['employeeLicenseId'], { code: 417 });
                                next(resp);
                            }
                        })
                }
                else {
                    licenses.isActive = 1;
                    licenses.createdBy = employeeDetailsId;
                    done()
                }
            },

            function (done) {
                crudOperationModel.saveModel(EmployeeLicense, licenses, condition)
                    .then((result) => {
                        if (result) {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                        } else {
                            let response = commonMethods.catchError('profile-management-controller/editUser manageLicenses process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageLicenses process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageLicenses process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                next(rs);
            }
        })
    }

    /**
     * Manage certifications
     * @param {*} employeeDetailsId : logged in user id
     * @param {*} certifications :certifications object
     */
    manageCertifications(employeeDetailsId, certifications, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };
        let resumeId = 0;

        async.series([
            function(done)
            {
                crudOperationModel.findAllByCondition(ResumeMaster, {employeeDetailsId : employeeDetailsId})
                .then( rdata => { 
                    if(rdata.length)
                    {   
                        resumeId = rdata[0].resumeId;                       
                        done();
                    }
                    else
                    {
                        resp.statusCode = 200;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(['errorText:invalidUser'], { code: 417 });
                        next(resp);
                    }
                })
            },  
            function (done) {
                async.map(certifications, function (item, cb) {
                    item.employeeDetailsId = employeeDetailsId;
                    item.createdBy = employeeDetailsId;
                    item.resumeId = resumeId;
                    crudOperationModel.saveModel(EmployeeCertificationDetails, item, { empCertificationDetailsId: (item.empCertificationDetailsId || 0) })
                        .then((result) => {
                            cb(null, result)
                        })

                }, function (err, rss) {
                    if (!err) {
                        done();
                    }
                    else {
                        done(err);
                    }
                })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('onboarding-controller/editUser manageCertifications process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                resp.statusCode = 200;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                next(resp);
            }
        })

    }

    /**
    * Manage skills
    * @param {*} employeeDetailsId : logged in user id
    * @param {*} skills :skill object
    */
    manageSkills(employeeDetailsId, skills, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };
        let resumeId = '';
        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: ~~employeeDetailsId })
                .then((resume) => {
                    if (resume) {
                        resumeId = resume.resumeId;
                        done()
                    } else {
                        done()
                    }
                })
                .catch(error => {
                    done(error);
                })
            },
            function (done) {
                async.map(skills, function (item, cb) {
                    item.employeeDetailsId = employeeDetailsId;
                    item.resumeId = resumeId;
                    // item.createdBy = employeeDetailsId;
                    crudOperationModel.saveModel(CandidateSkills, item, { candidateSkillId: (item.candidateSkillId || 0) })
                    .then((result) => {
                        cb(null, result)
                    })

                }, function (err, rss) {
                    if (!err) {
                        done();
                    }
                    else {
                        done(err);
                    }
                })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('onboarding-controller/editUser manageSkill process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                resp.statusCode = 200;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                next(resp);
            }
        })
    }

    /**
    * Manage candidateAchievements
    * @param {*} employeeDetailsId : logged in user id
    * @param {*} candidateAchievements :candidateAchievements object
    */
    manageCandidateAchievements(employeeDetailsId, candidateAchievements, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        },
            resumeId = 0;

        //check id exists or not

        let condition = { candidateAchievementId: 0 };
        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster,
                    {
                        employeeDetailsId: ~~employeeDetailsId
                    })
                    .then(resume => {
                        if (resume) {
                            resumeId = resume.resumeId;
                            if (candidateAchievements.candidateAchievementId != undefined && candidateAchievements.candidateAchievementId > 0) {
                                crudOperationModel.findModelByCondition(CandidateAchievement,
                                    {
                                        candidateAchievementId: ~~candidateAchievements.candidateAchievementId,
                                        resumeId: ~~resume.resumeId
                                    })
                                    .then((details) => {
                                        if (details) {
                                            candidateAchievements.modifiedBy = employeeDetailsId;
                                            candidateAchievements.modifiedDate = new Date();
                                            condition = { candidateAchievementId: candidateAchievements.candidateAchievementId };
                                            done();
                                        }
                                        else {
                                            resp.statusCode = 200;
                                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateAchievementId'], { code: 417 });
                                            next(resp);
                                        }
                                    })

                            }
                            else {
                                candidateAchievements.createdBy = employeeDetailsId;
                                candidateAchievements.createdDate = new Date();
                                done()
                            }
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateAchievementId'], { code: 417 });
                            next(resp);
                        }

                    })


            },

            function (done) {
                candidateAchievements.resumeId = resumeId;
                crudOperationModel.saveModel(CandidateAchievement, candidateAchievements, condition)
                    .then((result) => {
                        if (result) {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                        }
                        else {
                            let response = commonMethods.catchError('profile-management-controller/editUser manageExperiences process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageExperiences process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageExperiences process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                next(rs);
            }
        })
    }



    editUser(req, res, next) {
        console.log('-------onboarding---------')
        let response = responseFormat.createResponseTemplate(),
            msgCode = [],
            employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        let lastJobSearchStatus = 0;
        let resumeId = 0;
        let employeeData = {};
        let self = this;

        req.body.employeeDetailsId = employeeDetailsId;

        let resumeVars = enums.uploadType.userResume;
        let documentVars = enums.uploadType.userDocument;

        msgCode = onboardingValidation.editUserValidation(employeeDetailsId, req.body, resumeVars, documentVars);

        if (msgCode.length) 
        {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } 
        else 
        {

            let empDetails = {
                modifiedDate: new Date().toDateString(),
                modifiedOn: new Date().toDateString(),
                modifiedBy: employeeDetailsId
            };

           
            async.parallel([
                function(done)
                {
                    if (req.body.empDetails) 
                    {
                        if(req.body.empDetails.cityId)
                        {
                            //get state and country Id from city id
                            // crudOperationModel.findAllByCondition(CityList, { cityId: req.body.empDetails.cityId })
                            userModel.getStateCountryByCity(req.body.empDetails.cityId)
                            .then(city => {
                                if (city.length) 
                                { 
                                    empDetails.cityId = city[0].cityId;
                                    empDetails.stateId = city[0].stateId;
                                    empDetails.countryId = city[0].countryId || null;                                
                                    crudOperationModel.saveModel(ResumeMaster, empDetails, {employeeDetailsId : req.body.employeeDetailsId})
                                    .then( data => {
                                        
                                        let preferredAdd = city[0].city+', '+city[0].state;
                                        userModel.updatePreferredCity(employeeDetailsId, preferredAdd)
                                        .then( rs => {})
                                    
                                        done(null, 'empDetails')
                                    }).catch(error => {
                                        let response = commonMethods.catchError('onboarding-controller/editUser empDetails', error);                
                                        response = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                                        res.status(response.code).json(response);
                                    })
                                }
                                else
                                {
                                    done(null, 'empDetails')
                                }
                            })
                        }
                        else
                        {
                            done(null, 'empDetails')
                        }
                    }
                    else
                    {
                        done(null, 'empDetails')
                    }
                },
                function(done)
                {
                    if (req.body.educations) 
                    {
                        self.manageEducations(employeeDetailsId, req.body.educations, function (response) 
                        {
                            if(response.statusCode != 200)
                            {                        
                                res.status(response.statusCode).json(response.responseFormat);
                            }
                            done(null, 'educations');
                        })
                    }
                    else
                    {
                        done(null, 'educations')
                    } 
                },
                function(done)
                {
                    if (req.body.experiences) 
                    {               
                        self.manageExperiences(employeeDetailsId, req.body.experiences, function (response) 
                        {
                            if(response.statusCode != 200)
                            {                        
                                res.status(response.statusCode).json(response.responseFormat);
                            }
                            else
                            {
                                done(null, 'experiences');
                            }
                        })
                    }
                    else
                    {
                        done(null, 'experiences');
                    }
                },
                function(done)
                {
                    if (req.body.licensesAndCertifications) 
                    {
                        self.manageCertifications(employeeDetailsId, req.body.licensesAndCertifications, function (response) 
                        {
                            if(response.statusCode != 200)
                            {
                                res.status(response.statusCode).json(response.responseFormat);
                            }
                            else
                            {
                                done(null, 'licensesAndCertifications')
                            }
                        })
                    }
                    else
                    {
                        done(null, 'licensesAndCertifications')
                    }
                },
                function(done)
                {
                    if (req.body.skills) 
                    {
                        self.manageSkills(employeeDetailsId, req.body.skills, function (response) 
                        {
                            if(response.statusCode != 200)
                            {
                                res.status(response.statusCode).json(response.responseFormat);
                            }
                            else
                            {
                                done(null, 'skills');
                            }
                            
                        })

                    }
                    else
                    {
                        done(null, 'skills');
                    }
                },
                function(done)
                {
                    crudOperationModel.saveModel(ResumeMaster, {status : 1}, {employeeDetailsId : employeeDetailsId})
                    .then( up => {
                        done(null, 'status');
                    })
                }
                
            ],

            function(error, result)
            {
                if(error)
                {
                    let response = commonMethods.catchError('onboarding-controller/editUser.', error);                
                    response = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                    res.status(response.code).json(response);
                }            
                else 
                {
                    response = responseFormat.getResponseMessageByCodes(['saved']);
                    res.status(200).json(response);
                }
            })
 
        }
    }



}