/**
 *  -------Import all classes and packages -------------
 */
 
// call models
import accountModel from '../../models/accounts/accounts-model';
import UserModel from '../../models/profileManagement/profile-management-model-v5';
import SkillDetailsModel from '../../models/profileManagement/employee-skill-details-model';
import EducationDetailsModel from '../../models/profileManagement/employee-education-details-model';
import CrudOperationModel from '../../models/common/crud-operation-model';
import CandidateEmploymentExperienceModel from '../../models/profileManagement/candidate-employment-experience-model';
import EmailModel from '../../models/emails/emails-model';
import TimecardsModel from '../../models/timecards/timecards-model';
import JobsModel from '../../models/jobs/jobs-model'
import MyprojectsModel from '../../models/myProjects/my-projects-model'
import ProfileManagementModel from '../../models/profileManagement/profile-management-model-v5';
import RegionsModel from '../../models/regions/regions-model';
import SummaryModel from '../../models/summary/summary-model';
import { ATS_JobActivity } from "../../entities/jobs/ats-jobactivity";

// call all entities 
import {
    CandidateEmploymentExperience, Candidate_ResumeAndDoc, ResumeEducationDataType,
    EmployeeLicense, EmployeeCertificationDetails, CandidateAchievement, EmployeeDetails, ResumeMaster, EmployeeContactDetails, CandidateSkills,
    resumeTaxonomies, resumeSubTaxonomies, SocialContacts
} from "../../entities/index";

import { DMS } from '../../entities/employeeonboarding/dms';

import { CandidateReferral } from '../../entities/referrals/candidate-referral';
import { EmployeeDepositeDetails } from '../../entities/referrals/employee-deposite-details';
import { AppRefDataChild } from '../../entities/common/app-ref-data-child';

import responseFormat from '../../core/response-format';
import configContainer from '../../config/localhost';
import logger from '../../core/logger';
import redis from '../../core/redis-client';
import enums from '../../core/enums';
import CommonMethods from '../../core/common-methods';
import lodash from 'lodash';
import Q from 'q';
import async from 'async';
import ProfileManagementValidation from '../../validations/profileManagement/profile-management-validation';
import EditUserValidation from '../../validations/editUser/edit-user-validation.js';

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
    commonMethods = new CommonMethods(),
    jobsModel = new JobsModel(),
    profileManagementModel = new ProfileManagementModel(),
    regionsModel = new RegionsModel(),
    summaryModel = new SummaryModel();

const emailModel = new EmailModel();

export default class UserController {

    constructor() {
        //
    }

    /**
      * Get logged in user profile
      * @param {*} req : HTTP request argument
      * @param {*} res : HTTP response argument
      * @param {*} next : Callback argument
      */
    getUserProfile(req, res, next) {
        let authAccessToken = req.headers.authorizationToken;
        let response = responseFormat.createResponseTemplate();
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId,
            respData = [], promises = [];        
        if (employeeDetailsId) {

            promises.push(userModel.getUserProfileById(employeeDetailsId,authAccessToken));
            promises.push(educationDetailsModel.getEducationByEmployeeDetailsId(employeeDetailsId));
            promises.push(candidateEmploymentExperienceModel.getCandidateEmploymentExperienceByEmployeeDetailsId(employeeDetailsId));
            promises.push(userModel.getUserResumeDocumentsByEmployeeId(employeeDetailsId));
            // promises.push(userModel.getLicenseByEmployeeDetailsId(employeeDetailsId));
            promises.push(userModel.getCertificationByEmployeeDetailsId(employeeDetailsId));
            promises.push(skillDetailsModel.getSkillsByEmployeeDetailsId(employeeDetailsId));
            promises.push(userModel.getCandidateAchievementByEmployeeDetailsId(employeeDetailsId));
            promises.push(userModel.getUserTaxonomy(employeeDetailsId));
            promises.push(userModel.getUsersocialContacts(employeeDetailsId));
            promises.push(userModel.geEmployeementDetailsById(employeeDetailsId));
            promises.push(userModel.geEmployeementDetailsById(employeeDetailsId));          

            Q.all(promises).spread(function (empDetails, educations, experiences, documents, certifications, skills, candidateAchievements, taxonomy, socialContacts, employeementDetails) {
                let noticBoard = {
                    "healthcareApp": {
                        "show": true,
                        "message": "Great news! Your account is being upgraded to a new Healthcare experience, NurseDeck. You'll have access to all existing features and more."
                    }
                };
                respData.push({
                    empDetails: empDetails,
                    educations: educations,
                    experiences: experiences,
                    documents: documents.documents,
                    resume: documents.resume,
                    w9: documents.w9,
                    interviewTemplate: documents.interviewTemplate,
                    // licenses: licenses,
                    licensesAndCertifications: certifications,
                    skills: skills,
                    candidateAchievements: candidateAchievements,
                    taxonomy: taxonomy,
                    socialContacts: socialContacts,
                    employeementDetails: employeementDetails[0]                    
                });

                respData[0].empDetails.noticeBoard = noticBoard;
                if (respData[0].empDetails.employeeTypeId == enums.employeeType.inHouse) {
                    respData[0].empDetails.resumeUploaded = 1;
                    respData[0].empDetails.onBoarding = 0;
                }
                else if (respData[0].empDetails.employeeTypeId != enums.employeeType.externalUser && respData[0].empDetails.activeProjects > 0 && respData[0].resume.length) {
                    respData[0].empDetails.resumeUploaded = 1;
                }
                let profileStrengthCount = commonMethods.calculateProfileStrength(respData);
                respData[0].empDetails.profileStrength = profileStrengthCount;
                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                res.status(200).json(response);
            });
        } else {
            response = responseFormat.getResponseMessageByCodes(['invalidAuthToken'], { code: 417 });
            res.status(200).json(response);
        }
    }

    /**
     * Edit logged in user 
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
    */

    editUser(req, res, next) {
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
        msgCode = editUserValidation.editUserValidation_v6(employeeDetailsId, req.body, resumeVars, documentVars);


        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {

            //===== update employee status to active in ResumeMaster
            this.updateEmployeeStatus(employeeDetailsId, function (result) { })


            let empDetails = {};
            if (req.body.empDetails) {
                empDetails = req.body.empDetails;
                empDetails['modifiedDate'] = new Date().toDateString();
                empDetails['modifiedBy'] = employeeDetailsId;

                let condition = { employeeDetailsId: 0 };
                if (employeeDetailsId != undefined && employeeDetailsId > 0) {
                    condition = { employeeDetailsId: employeeDetailsId };
                    empDetails.employeeDetailsId = employeeDetailsId;
                };

                async.series([
                    function (done) {
                        if (empDetails.profilePicture && empDetails.profilePicture != '') {
                            let fileType = commonMethods.getIncomingFileExtension(empDetails.profilePicture);

                            let profileVars = enums.uploadType.userPicture;

                            if (profileVars.allowedExt.indexOf(fileType) < 0) {
                                response = responseFormat.getResponseMessageByCodes(['profilePicture'], { code: 417 });
                                res.status(200).json(response);
                            }
                            else {

                                commonMethods.imageProcess(empDetails.profilePicture)
                                    .then(dt => {
                                        if (dt.success) {
                                            userModel.uploadProfilePic(employeeDetailsId, dt.fileData)
                                                .then((updateUser) => {
                                                    if (updateUser.isSuccess) {
                                                        empDetails.profilePicture = updateUser.profilePicture;
                                                        done();
                                                    }
                                                    else {
                                                        response = responseFormat.getResponseMessageByCodes(['profilePicture:' + updateUser.msgCode[0]], { code: 417 });
                                                        res.status(200).json(response);
                                                    }
                                                })
                                                .catch((error) => {
                                                    let resp = commonMethods.catchError('profile-management-controller/editUser upload profile pic', error);
                                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                    res.status(resp.code).json(response);
                                                })
                                        }
                                        else {
                                            let resp = commonMethods.catchError('profile-management-controller/editUser resize profile pic', dt.error);
                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                            res.status(resp.code).json(response);
                                        }
                                    })

                            }

                        }
                        else {
                            done();
                        }
                    },
                    function (done) {
                        // get cityId when cityName is passed in input
                        if (empDetails.city && !empDetails.cityId) {
                            regionsModel.getLocationBySearch(empDetails.city)
                                .then((location) => {
                                    if (location.length) {
                                        empDetails.cityId = location[0].cityId;
                                        done();
                                    }
                                    else {
                                        done();
                                    }
                                })
                        }
                        else {
                            done();
                        }
                    },
                    function (done) {
                        if (empDetails.cityId) {
                            //get state and country Id from city id
                            userModel.getStateCountryByCity(empDetails.cityId)
                                .then(city => {
                                    if (city.length) {
                                        empDetails.cityId = city[0].cityId;
                                        empDetails.stateId = city[0].stateId;
                                        empDetails.countryId = city[0].countryId || null;

                                        if (!empDetails.prefferedCity) {
                                            let preferredAdd = city[0].city + ', ' + city[0].state;
                                            userModel.updatePreferredCity(employeeDetailsId, preferredAdd)
                                                .then(rs => { })
                                        }
                                    }
                                    done();
                                })
                        }
                        else {
                            done();
                        }
                    },
                    function (done) {
                        delete empDetails['emailId'];                        

                        crudOperationModel.saveModel(EmployeeDetails, empDetails, condition)
                            .then(rs => {
                                employeeData = rs;
                                done();
                            }).catch((error) => {
                                let resp = commonMethods.catchError('profile-management-controller/editUser EmployeeDetails process.', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    },
                    function (done) {

                        crudOperationModel.saveModel(EmployeeContactDetails, empDetails, condition)
                            .then(rs1 => {
                                done()
                            }).catch((error) => {
                                let resp = commonMethods.catchError('profile-management-controller/editUser EmployeeContactDetails process.', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    },
                    function (done) {

                        if (empDetails.paypalId) {
                            let depositData = {
                                employeeDetailsId: employeeDetailsId,
                                accountTypeId: enums.accountType.paypal,
                                paymentUserId: empDetails.paypalId,
                            }
                            crudOperationModel.saveModel(EmployeeDepositeDetails, depositData, condition)
                                .then(rs1 => {
                                    done()
                                }).catch((error) => {
                                    let resp = commonMethods.catchError('profile-management-controller/editUser EmployeeDepositeDetails process.', error);
                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                    res.status(resp.code).json(response);
                                })
                        }
                        else {
                            done();
                        }

                    },
                    function (done) {

                        crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                            .then(resp => {
                                if (resp) {
                                    lastJobSearchStatus = resp.jobSearchStatusId;
                                    done();
                                } else {
                                    done();
                                }
                            })
                    },
                    function (done) {
                        if (empDetails.prefferedCity) {
                            empDetails.prefferedCity = empDetails.prefferedCity.join("||");
                        }
                        if (empDetails.desiredEmployementKey) {
                            empDetails.desiredEmployementKey = empDetails.desiredEmployementKey.join("|");
                        }
                        if (empDetails.publicProfile === "") {
                            empDetails.publicProfile = 0;
                        }
                        if (empDetails.interestedSme === "") {
                            empDetails.interestedSme = 0;
                        }
                        if (empDetails.interestedCounsellor === "") {
                            empDetails.interestedCounsellor = 0;
                        }
                        if (typeof empDetails.domainId && (empDetails.domainId == "" || empDetails.domainId == 0)) {
                            empDetails.domainId = null;
                        }
                        if (typeof empDetails.subDomainId && (empDetails.subDomainId == "" || empDetails.subDomainId == 0)) {
                            empDetails.subDomainId = null;
                        }

                        if (typeof empDetails.skill && (empDetails.skill == "" || empDetails.skill == 0)) {
                            empDetails.skill = null;
                        }

                        if (typeof empDetails.Role && (empDetails.Role == "" || empDetails.Role == 0)) {
                            empDetails.Role = null;
                        }

                        /*if (typeof empDetails.domainId && (empDetails.domainId == "" || empDetails.domainId == 0)) {
                            empDetails.domainId = null;
                        }*/

                        if (empDetails.annualSalary || empDetails.annualSalary == '') {
                            empDetails.annualSalary = ~~empDetails.annualSalary > 0 ? parseFloat(Number(empDetails.annualSalary)) : 0;
                        }

                        if (empDetails.smeStatusId) {
                            empDetails.smeStatusId = enums.sme.applicationStatus.inProcess
                        }



                        if (empDetails.jobSearchStatusId) {
                            // update job search status and switch off email and push notification 
                            if (empDetails.jobSearchStatusId == enums.referred.notLookingForOpportunity) {
                                accountModel.updateUserJobSearchStatus(employeeDetailsId)
                                    .then(rs => {
                                        crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                                            .then(user => {
                                                let jobActivity = {
                                                    candidateId: user.resumeId,
                                                    clientJobId: "-1",
                                                    activityLog: "Job search status updated",
                                                    dataComeFrom: 2,
                                                    createdOn: new Date(),
                                                    createdBy: user.employeeDetailsId,
                                                    activityType: 15351,
                                                    CompanyMaster_Id: user.companyMasterId || enums.compnayMaster.default
                                                }
                                                crudOperationModel.saveModel(ATS_JobActivity, jobActivity, { jobactivityId: 0 })
                                                    .then((rs) => {
                                                        accountModel.initUpdateTrigger(employeeDetailsId);
                                                    })
                                            });

                                    })
                            }
                        }

                        crudOperationModel.saveModel(ResumeMaster, empDetails, condition)
                            .then(rs2 => {
                                resumeId = rs2.resumeId;
                                done();
                            }).catch((error) => {
                                let resp = commonMethods.catchError('profile-management-controller/editUser ResumeMaster process.', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })
                    },
                    // function(done){
                    //     if(empDetails.jobSearchStatusId && empDetails.jobSearchStatusId != lastJobSearchStatus)
                    //     {
                    //         let historyData = {
                    //             resumeId: resumeId,
                    //             searchStatusOldId: lastJobSearchStatus,
                    //             searchStatusNewId: empDetails.jobSearchStatusId,
                    //             createdDate: new Date(),
                    //             createdBy: employeeDetailsId
                    //         };
                    //         crudOperationModel.saveModel(JobSearchStatusHistory, historyData, {jobSearchStatusHistoryId: 0})
                    //         .then(jssh => { 
                    //             done();
                    //         }).catch((error) => {
                    //             let resp = commonMethods.catchError('profile-management-controller/editUser JobSearchStatusHistory process.', error);
                    //             response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    //             res.status(resp.code).json(response);
                    //         })
                    //     }
                    //     else
                    //     {
                    //         done();
                    //     }
                    // }
                ],
                    function (error) {
                        if (error) {
                            let resp = commonMethods.catchError('profile-management-controller/editUser ResumeMaster process.', error);
                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                            res.status(resp.code).json(response);
                        }


                        // update employee status to active in resume_master
                        self.updateEmployeeStatus(employeeDetailsId, function (rs) { })

                        // Email to recruiter if job-search-status updated to Actively-Looking
                        // if job search status change request received
                        if (empDetails.jobSearchStatusId
                            && empDetails.jobSearchStatusId == enums.referred.activelyLookingStatus
                            && lastJobSearchStatus != enums.referred.activelyLookingStatus) {
                            //check if candidate is being referred by someone
                            crudOperationModel.findAllByCondition(CandidateReferral, { resumeId: resumeId })
                                .then(userData => {

                                    if (userData.length) {
                                        // get recuriter details
                                        crudOperationModel.findAllByCondition(EmployeeDetails, { employeeDetailsId: userData[0].employeeDetailsId })
                                            .then(recData => {
                                                if (recData.length) {
                                                    let data = [
                                                        { name: "RECIPIENTFIRSTNAME", value: recData[0].firstName },
                                                        { name: "REFERRALNAME", value: (employeeData.firstName + ' ' + employeeData.lastName) },
                                                        { name: "REFERRALEMAIL", value: employeeData.emailId },
                                                        { name: "REFERRALFIRSTNAME", value: employeeData.firstName }
                                                    ];
                                                    let options = {
                                                        mailTemplateCode: enums.emailConfig.codes.adminMails.updateJobSearch,
                                                        toMail: [{ mailId: recData[0].emailId, displayName: recData[0].firstName }],
                                                        placeHolders: data,
                                                        replyToEmailid: 'SUPPORTMAILID',
                                                        companyMasterId: recData[0].CompanyMaster_Id || enums.compnayMaster.default,
                                                        senderId: employeeDetailsId || 0
                                                    };

                                                    emailModel.mail(options, 'profile-management-controller/edituser recruiter-mail')
                                                        .then(rs => { })
                                                }
                                            });
                                    }
                                })
                        }
                        response = responseFormat.getResponseMessageByCodes(['success:saved']);
                        res.status(200).json(response);
                    })
            }
            else if (req.body.educations) {
                this.manageEducations(employeeDetailsId, req.body.educations, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else if (req.body.experiences) {
                this.manageExperiences(employeeDetailsId, req.body.experiences, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else if (req.body.documents) {
                this.manageDocuments(employeeDetailsId, req.body.documents, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else if (req.body.licensesAndCertifications) {
                this.manageCertifications(employeeDetailsId, req.body.licensesAndCertifications, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else if (req.body.skills) {
                this.manageSkills(employeeDetailsId, req.body.skills, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else if (req.body.candidateAchievements) {
                this.manageCandidateAchievements(employeeDetailsId, req.body.candidateAchievements, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else if (req.body.taxonomy) {
                this.manageTaxonomy(employeeDetailsId, req.body.taxonomy, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })

            }
            else if (req.body.socialContacts) {
                this.manageSocialContacts(employeeDetailsId, req.body.socialContacts, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }else if (req.body.changePrimaryEmail) {
                this.manageChangePrimaryEmail(employeeDetailsId, req.body.changePrimaryEmail, function (response) {
                    res.status(response.statusCode).json(response.responseFormat);
                })
            }
            else {
                response = responseFormat.getResponseMessageByCodes(['blankRequest'], { code: 417 });
                res.status(200).json(response);
            }
        }
    }

    updateEmployeeStatus(employeeDetailsId, next) {
        crudOperationModel.saveModel(ResumeMaster, { status: 1 }, { employeeDetailsId: employeeDetailsId })
            .then(up => {
                next(up);
            })
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
        // return new Promise((resolve, reject) => {
        //check id exists or not

        let self = this;
        let companyMasterId = enums.compnayMaster.default;

        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['employeeEducationId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {

                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: ~~employeeDetailsId })
                    .then((resume) => {
                        if (resume) {
                            educations.resumeId = resume.resumeId;
                            educations.CompanyMaster_Id = companyMasterId;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['employeeEducationId'], { code: 417 });
                            next(resp);
                        }
                    })

            },

            function (done) {
                educations.passingYear = new Date(educations.passingYear, 1, 1);
                crudOperationModel.saveModel(ResumeEducationDataType, educations, { employeeEducationId: educations.employeeEducationId })
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })

                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                        } else {
                            let response = commonMethods.catchError('profile-management-controller/editUser manageEducations process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });

                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser EmployeeEducationDetails process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser EmployeeEducationDetails series process.', error);
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
  * Manage experiences
  * @param {*} employeeDetailsId : logged in user id
  * @param {*} experiences :experiences object
  */
    manageExperiences(employeeDetailsId, experiences, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        },
            resumeId = 0;
        // return new Promise((resolve, reject) => {
        //check id exists or not

        let self = this;
        let companyMasterId = enums.compnayMaster.default;
        let condition = { candidateEmploymentExperienceId: 0 };

        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateEmploymentExperienceId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster,
                    {
                        employeeDetailsId: ~~employeeDetailsId
                    })
                    .then((resume) => {
                        if (resume) {
                            resumeId = resume.resumeId;
                            if (experiences.candidateEmploymentExperienceId != undefined && experiences.candidateEmploymentExperienceId > 0) {
                                crudOperationModel.findModelByCondition(CandidateEmploymentExperience,
                                    {
                                        candidateEmploymentExperienceId: ~~experiences.candidateEmploymentExperienceId,
                                        resumeId: ~~resume.resumeId
                                    })
                                    .then((details) => {
                                        if (details) {
                                            experiences.modifiedBy = employeeDetailsId;
                                            experiences.modifiedDate = new Date();
                                            condition = { candidateEmploymentExperienceId: experiences.candidateEmploymentExperienceId };
                                            done();
                                        }
                                        else {
                                            resp.statusCode = 200;
                                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateEmploymentExperienceId'], { code: 417 });
                                            next(resp);
                                        }
                                    })
                            }
                            else {
                                experiences.createdBy = employeeDetailsId;
                                experiences.CompanyMaster_Id = companyMasterId;
                                experiences.createdDate = new Date();
                                done();
                            }
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateEmploymentExperienceId'], { code: 417 });
                            next(resp);
                        }
                    })

            },

            function (done) {
                experiences.resumeId = resumeId;
                experiences.positionEndDate = (!experiences.positionEndDate) ? null : experiences.positionEndDate;
                crudOperationModel.saveModel(CandidateEmploymentExperience, experiences, condition)
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })
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


    /**
     * Manage documents
     * @param {*} employeeDetailsId : logged in user id
     * @param {*} documents :documents object
     */
    manageDocuments(employeeDetailsId, documents, next) {
        console.log('-----manageDocuments------')
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        },
            self = this,
            resumeId = 0;
        //let allDocument = enums.documentUploadType.allDocument;
        let companyMasterId = enums.compnayMaster.default;
        let file = documents.file;
        let fileName = documents.fileName;
        let resumeVars = enums.uploadType.userResume;
        let documentVars = enums.uploadType.userDocument;

        let docType = documents.fileType == enums.uploadType.docTypes.resume ? resumeVars.docTypeId : documentVars.docTypeId;
        let dmsDocId = null;

        let condition = { candidateDocId: 0 };
        let resumeObj = {};
        let documentType;
        if (documents.fileType == enums.uploadType.docTypes.resume){
            documentType = enums.documentType.resume;
        }
        
        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateDocId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: ~~employeeDetailsId })
                    .then((resume) => {
                        if (resume) {
                            resumeId = resume.resumeId;
                            resumeObj['emailId'] = resume.emailId;
                            resumeObj['firstName'] = resume.firstName;
                            resumeObj['lastName'] = resume.lastName;
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
                                    }).catch(error => {
                                        let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.', error);
                                        resp.statusCode = response.code;
                                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                                        next(resp);
                                    })

                            }
                            else {
                                documents.createdBy = employeeDetailsId;
                                documents.CompanyMaster_Id = companyMasterId;
                                documents.createdDate = new Date();
                                done();
                            }
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['erroText:invalidUser'], { code: 417 });
                            next(resp);
                        }
                    })

            },
            function (done) {
                // parse resume 
                if (documents.fileType == enums.uploadType.docTypes.resume) {
                    accountModel.parseResume(resumeId, fileName, file, 'profile-management-controller/manageDocuments parseResume', resumeObj)
                        .then(parse => {
                            if (parse.isSuccess) {
                                done();
                            }
                            else {
                                resp.statusCode = 200;
                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['errorText:invalidResume'], { code: 417 });
                                next(resp);
                            }
                        })
                }
                else {
                    done()
                }
            },
            function (done) {                
                // parse resume 
                if (documents.fileType != enums.uploadType.docTypes.resume) {
                    enums.documentUploadType.allDocument.forEach((items, index) => {
                        if ( items.key == documents.docName){                                                    
                            documentType = items.docTypeId;
                            documents.docName = items.value;
                            done();
                        }
                    })
                }
                else {
                    documentType = enums.documentType.resume;             
                    done()
                }
            },
            function (done) {
                // upload resume
                commonMethods.fileUpload(file, fileName, docType, null, null, employeeDetailsId)
                    .then((docFileUpload) => {
                        if (docFileUpload.isSuccess) {

                            let dmsDoc = {
                                documentModule: 1,
                                empClientVendorId: employeeDetailsId,
                                employeeId: employeeDetailsId,
                                DocumentType: documentType,
                                fileName: docFileUpload.fileName,
                                documentName: documents.docName,
                                status: 1,
                                dataInsertFrom:documents.fileType == enums.uploadType.docTypes.resume ? enums.dataInsertFrom.resumeUpdate : enums.dataInsertFrom.resumeAndDoc,
                                createdDate: new Date(),
                                createdBy: employeeDetailsId,
                                CompanyMaster_Id: companyMasterId,
                                BaseUrlTypeId: enums.baseUrlType.typeId
                            };

                            crudOperationModel.saveModel(DMS, dmsDoc, { dmsId : 0 })
                            .then((result) => { 
                                if(result)
                                {
                                    dmsDocId = result.dmsId;
                                    let resumeDoc = {
                                        resumeId: resumeId,
                                        filePath: docFileUpload.fileName,
                                        fileName: documents.docName,
                                        isPrimary: documents.fileType == enums.uploadType.docTypes.resume ? 1 : 0,
                                        docType: documents.fileType,
                                        createdBy: employeeDetailsId,
                                        dmsId: dmsDocId,
                                        CompanyMaster_Id:companyMasterId,
                                        createdDate: new Date()
                                    };

                                    profileManagementModel.updateCandidateResume(resumeDoc)
                                        .then((res) => {
                                            if (res) {
                                                resp.statusCode = 200;
                                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                                                next(resp);
                                            }
                                            else {
                                                let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.');
                                                resp.statusCode = response.code;
                                                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
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
                                else
                                {
                                    let response = commonMethods.catchError('profile-management-controller/editUser manageDocuments process.');
                                    resp.statusCode = response.code;
                                    resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                                    next(resp);
                                }
                            }).catch(error => {
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
            },

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

        let self = this;
        let condition = { employeeLicenseId: 0 };
        let companyMasterId = enums.compnayMaster.default;
        licenses.employeeDetailsId = employeeDetailsId;

        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['employeeLicenseId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
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
                    licenses.CompanyMaster_Id = companyMasterId;
                    licenses.createdBy = employeeDetailsId;
                    done()
                }
            },

            function (done) {
                crudOperationModel.saveModel(EmployeeLicense, licenses, condition)
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })
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

        let self = this;
        let condition = { empCertificationDetailsId: 0 };
        let resumeId = 0;
        let companyMasterId = enums.compnayMaster.default;
        certifications.employeeDetailsId = employeeDetailsId;

        async.series([
            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['empCertificationDetailsId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                crudOperationModel.findAllByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                    .then(rdata => {
                        if (rdata.length) {
                            resumeId = rdata[0].resumeId;
                            certifications.resumeId = rdata[0].resumeId;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['errorText:invalidUser'], { code: 417 });
                            next(resp);
                        }
                    })
            },
            function (done) {
                if (certifications.empCertificationDetailsId != undefined && certifications.empCertificationDetailsId > 0) {
                    //check id exists or not
                    crudOperationModel.findModelByCondition(EmployeeCertificationDetails,
                        {
                            empCertificationDetailsId: ~~certifications.empCertificationDetailsId,
                            resumeId: resumeId
                        })
                        .then((details) => {
                            if (details) {
                                certifications.modifiedBy = employeeDetailsId;
                                certifications.modifiedDate = new Date();
                                condition = { empCertificationDetailsId: certifications.empCertificationDetailsId };
                                done();
                            }
                            else {
                                resp.statusCode = 200;
                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['empCertificationDetailsId'], { code: 417 });
                                next(resp);
                            }
                        })
                }
                else {
                    certifications.status = 1;
                    certifications.createdBy = employeeDetailsId;
                    certifications.CompanyMaster_Id = companyMasterId;
                    certifications.createdDate = new Date();
                    done()
                }
            },

            function (done) {
                crudOperationModel.saveModel(EmployeeCertificationDetails, certifications, condition)
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                        }
                        else {
                            let response = commonMethods.catchError('profile-management-controller/editUser manageCertifications process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageCertifications process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageCertifications process.', error);
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
    * Manage skills
    * @param {*} employeeDetailsId : logged in user id
    * @param {*} skills :skill object
    */
    manageSkills(employeeDetailsId, skills, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };
        // return new Promise((resolve, reject) => {
        //check id exists or not
        let self = this;
        let condition = { candidateSkillId: 0 };

        skills.employeeDetailsId = employeeDetailsId;
        skills.companyMasterId = enums.compnayMaster.default;

        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            skills.companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateSkillId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                //fetch resume_id
                skills.resumeId = '';
                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                    .then((resume) => {
                        if (resume) {
                            skills.resumeId = resume.resumeId;
                            done()
                        } else {
                            done()
                        }
                    })
                    .catch(error => {
                        done();
                    })
            },
            function (done) {
                let where = {
                    resumeId: skills.resumeId,
                    skillName: skills.skillName
                };

                if (skills.candidateSkillId) {
                    where['candidateSkillId'] = {
                        $ne: skills.candidateSkillId
                    }
                }
                // check for duplicate skill
                crudOperationModel.findModelByCondition(CandidateSkills, where)
                    .then(rs => {
                        if (rs) {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['skillName:duplicateSkill'], { code: 417 });
                            next(resp);
                        }
                        else {
                            done();
                        }
                    })
            },
            function (done) {
                if (skills.isPrimary) {
                    // check if user has 5 skills or not
                    crudOperationModel.findAllByCondition(CandidateSkills, { resumeId: skills.resumeId, isPrimary: 1 })
                        .then(rs => {
                            if (rs.length >= fieldsLength.users.maxPrimarySkills) {
                                resp.statusCode = 200;
                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['isPrimary:numSkills'], { code: 417 });
                                next(resp);
                            }
                            else {
                                done();
                            }
                        })
                }
                else {
                    done()
                }

            },
            function (done) {
                if (skills.candidateSkillId != undefined && skills.candidateSkillId > 0) {
                    //check id exists or not
                    crudOperationModel.findModelByCondition(CandidateSkills,
                        {
                            candidateSkillId: ~~skills.candidateSkillId,
                            resumeId: ~~skills.resumeId
                        })
                        .then((details) => {
                            if (details) {
                                // skills.modifiedBy = employeeDetailsId;
                                // skills.modifiedDate = new Date();
                                condition = { candidateSkillId: skills.candidateSkillId };
                                done();
                            } else {
                                resp.statusCode = 200;
                                resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateSkillId'], { code: 417 });
                                next(resp);
                            }
                        })
                }
                else {
                    // skills.createdBy = employeeDetailsId;
                    // skills.createdDate = new Date();
                    done()
                }
            },
            function (done) {
                crudOperationModel.saveModel(CandidateSkills, skills, condition)
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                        } else {
                            let response = commonMethods.catchError('profile-management-controller/editUser manageSkill process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageSkill process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageSkill process.', error);
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

        let self = this;
        let condition = { candidateAchievementId: candidateAchievements.candidateAchievementId || 0 };
        let companyMasterId = enums.compnayMaster.default;

        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateSkillId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                crudOperationModel.findModelByCondition(ResumeMaster,
                    {
                        employeeDetailsId: ~~employeeDetailsId
                    })
                    .then(resume => {
                        if (resume) {
                            resumeId = resume.resumeId;
                            done();
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
                candidateAchievements.CompanyMaster_Id = companyMasterId;
                crudOperationModel.saveModel(CandidateAchievement, candidateAchievements, condition)
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })
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


    /**
    * Manage Taxonomy
    * @param {*} employeeDetailsId : logged in user id
    * @param {*} taxonomy :skill object
    */
    manageTaxonomy(employeeDetailsId, taxonomy, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        let resumeId = 0;
        let companyMasterId = enums.compnayMaster.default;

        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateSkillId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                //fetch resume_id
                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                    .then((resume) => {
                        if (resume) {
                            resumeId = resume.resumeId;
                            done()
                        }
                        else {
                            done('invalid user : resume-id missing')
                        }
                    })
                    .catch(error => {
                        done(error);
                    })
            },
            function (done) {
                // delete all taxonomy for user 
                crudOperationModel.deleteModel(resumeTaxonomies, { resumeId: resumeId })
                    .then(d1 => {

                        crudOperationModel.deleteModel(resumeSubTaxonomies, { resumeId: resumeId })
                            .then(d2 => {

                                done()
                            }).catch(error => {
                                done(error);
                            })
                    }).catch(error => {
                        done(error);
                    })

            },
            function (done) {
                // insert all taxonomy

                let parentTaxonomies = taxonomy.map(t => {
                    return { resumeId: resumeId, taxonomyId: t.keyId, taxonomy: t.keyName, CompanyMaster_Id: companyMasterId }
                })

                let childTaxonomies = taxonomy.map(t => {
                    return t.child.map(t1 => {
                        return {
                            resumeId: resumeId, taxonomyId: t.keyId, subTaxonomyId: t1.keyId,
                            subTaxonomy: t1.keyName, CompanyMaster_Id: companyMasterId
                        }
                    })
                })

                crudOperationModel.bulkSave(resumeTaxonomies, parentTaxonomies)
                    .then(result => {

                        crudOperationModel.bulkSave(resumeSubTaxonomies, [].concat.apply([], childTaxonomies))
                            .then(result => {
                                done()
                            }).catch((error) => {
                                done(error)
                            })

                    }).catch((error) => {
                        done(error)
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageTaxonomy process.', error);
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


    manageSocialContacts(employeeDetailsId, socialContacts, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };

        socialContacts['createdBy'] = employeeDetailsId;
        socialContacts['createdDate'] = new Date();
        socialContacts.CompanyMaster_Id = enums.compnayMaster.default;

        async.series([

            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            socialContacts.CompanyMaster_Id = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['candidateSkillId'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                //fetch resume_id
                crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                    .then((resume) => {
                        if (resume) {
                            socialContacts['resumeId'] = resume.resumeId;
                            done()
                        }
                        else {
                            done('invalid user : resume-id missing')
                        }
                    })
                    .catch(error => {
                        done(error);
                    })
            },
            function (done) {

                let where = {
                    socialContactsId: socialContacts.socialContactsId || 0,
                }
                crudOperationModel.saveModel(SocialContacts, socialContacts, where)
                    .then(rs => {
                        done()
                    }).catch(error => {
                        done(error);
                    })
            },

        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageSocialContacts process.', error);
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

    manageChangePrimaryEmail(employeeDetailsId, emailContacts, next) {
        let resp = {
            statusCode: 400,
            responseFormat: responseFormat.createResponseTemplate()
        };       
        let companyMasterId = enums.compnayMaster.default;
        let primaryEmail = emailContacts.primaryEmailId;
        let newEmail = emailContacts.newEmailId;
        let self = this; 
        let userName;
        async.series([
            function (done) {
                accountModel.getUserByUserName(primaryEmail)
                    .then((data) => {
                        if (data && data.length) {
                            userName = data[0].First_Name;
                            console.log(userName)
                            done();
                        }else{
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['userName'], { code: 417 });
                            next(resp);
                        }
                })
                .catch((error) => {
                    let response = commonMethods.catchError('profile-management-controller/editUser manageChangePrimaryEmail process.', error);
                    resp.statusCode = response.code;
                    resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                    next(resp);
                });                
            },
            function (done) {
                accountModel.checkEmailExist(newEmail)
                    .then((email) => {

                        if ((!email) || employeeDetailsId == email.EmployeeDetails_Id) {
                            done();
                        } else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['emailExists:emailExists'], { code: 417 });
                            next(resp);
                        }
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageChangePrimaryEmail process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    });
            },            
            function (done) {
                crudOperationModel.findModelByCondition(EmployeeDetails, { employeeDetailsId: employeeDetailsId })
                    .then(emp => {
                        if (emp) {
                            companyMasterId = emp.CompanyMaster_Id;
                            done();
                        }
                        else {
                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['userName'], { code: 417 });
                            next(resp);
                        }
                    });
            },
            function (done) {
                crudOperationModel.saveModel(EmployeeDetails, {temporaryEmail : newEmail}, {employeeDetailsId : employeeDetailsId})
                    .then( rs => {                        
                        done();
                    }).catch((error) => {
                        let response = commonMethods.catchError('profile-management-controller/editUser manageChangePrimaryEmail process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            },
            function (done) { 
                let data = [
                    { name: "CURRENTEMAIL", value: primaryEmail},
                    { name: "NEWEMAIL", value: newEmail},
                    { name: "USERFIRSTNAME", value:userName}
                ];
                let options = {
                    mailTemplateCode: enums.emailConfig.codes.changeEmail.existingEmail,
                    toMail: [{ mailId: primaryEmail, displayName: userName }],
                    placeHolders: data,
                    replyToEmailid: 'SUPPORTMAILID',                          
                    companyMasterId: companyMasterId,
                    senderId: employeeDetailsId || 0
                };
                emailModel.mail(options, 'profile-management-controller/edituser manageChangePrimaryEmail')
                    .then(rs => { })
                done()
            },
            function (done) {                
                let codeKey = {
                    emplyeeDetailId:employeeDetailsId,
                    exitingEmail:primaryEmail,
                    newEmail:newEmail,
                    created:(new Date()).toISOString().split('T')[0],
                    action:'upe'
                }                
                let encKey = commonMethods.encrypt(JSON.stringify(codeKey));
                console.log(encKey)
                let data = [
                    { name: "CURRENTEMAIL", value: primaryEmail},
                    { name: "NEWEMAIL", value: newEmail},
                    { name: "USERFIRSTNAME", value:userName},
                    { name: "activatetoken", value:encKey}
                ];                

                let options = {
                    mailTemplateCode: enums.emailConfig.codes.changeEmail.newEmail,
                    toMail: [{ mailId: primaryEmail, displayName: userName }],
                    placeHolders: data,
                    replyToEmailid: 'SUPPORTMAILID',                            
                    companyMasterId: companyMasterId,
                    senderId: employeeDetailsId || 0
                };
                emailModel.mail(options, 'profile-management-controller/edituser manageChangePrimaryEmail')
                    .then(rs => { })                
                done()
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('profile-management-controller/editUser manageChangePrimaryEmail process.', error);
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
     * Get all lookups data and add it into in redis cache
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    getAllLookups(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let respData = [{
            authorizationStatusList: null,
            jobSearchStatusList: null,
            licenseTypeList: null,
            qualificationList: null,
            availability: null,
            desiredEmployement: null,
            rateType: null,
            empIndustryVerticalList: null,
            experienceList: null,
            taxonomyList: [],
            timecardFrequencyList: [],
            severityType: [],
            companyList: [],
            countryDialCode: [],
            departmentList: [],
            uploadDocType:[],
            vacationType: [],
            vacationLocation: [],
            companyGroup: [],
        }];
        
        // redis.exists(REDIS_LOOKUPS_KEY, (err, reply) => {
        //     if (reply == 1) {
        //         redis.get(REDIS_LOOKUPS_KEY, (err, reply) => {
        //             if (reply) {
        //                 respData = JSON.parse(reply);
        //                 response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
        //                 res.status(200).json(response);
        //             }
        //         });
        //     } else {

        userModel.getProfileLookupData()
            .then((responseList) => {
                respData[0].authorizationStatusList = this.filterLookupCollection(responseList, "ASL");
                let allJobSearchStatusList = this.filterLookupCollection(responseList, "JSSL");
                respData[0].licenseTypeList = this.filterLookupCollection(responseList, "LTL");
                respData[0].qualificationList = this.filterLookupCollection(responseList, "DL");
                //respData[0].empIndustryVerticalList = this.filterLookupCollection(responseList, "IV");
                respData[0].experienceList = this.filterLookupCollection(responseList, "EXP");
                respData[0].domainList = this.filterLookupCollection(responseList, "DMN");
                respData[0].reasonList = this.filterLookupCollection(responseList, "RSN");
                let allTaxonomy = this.filterLookupCollection(responseList, "TXN");
                respData[0].timecardFrequencyList = this.filterLookupCollection(responseList, "FRQ");
                respData[0].socialMediaList = this.filterLookupCollection(responseList, "SML");
                respData[0].docTypeList = this.filterLookupCollection(responseList, "DTL");
                respData[0].severityType = this.filterLookupCollection(responseList, "ST");
                respData[0].companyList = this.filterLookupCollection(responseList, "COM");
                respData[0].countryDialCode = this.filterLookupCollection(responseList, "CDC");
                respData[0].vacationType = this.filterLookupCollection(responseList, "VAT");
                respData[0].vacationLocation = this.filterLookupCollection(responseList, "VAL");
                respData[0].departmentList = this.filterLookupCollection(responseList, "DPT");
                respData[0].uploadDocType = this.filterDocumentType(enums.documentUploadType.allDocument);
                //respData[0].departmentList = this.filterLookupCollection(responseList, "DPT");                
                respData[0].companyGroup = this.filterLookupCollection(responseList, "WPDN");
                respData[0].jobSearchStatusList = [];
                if (allJobSearchStatusList.length) {
                    allJobSearchStatusList.forEach(tx => {
                        if (tx.keyId == 4751 || tx.keyId == 4753) {
                            respData[0].jobSearchStatusList.push(tx);
                        }
                    });
                }

                if (allTaxonomy.length) {
                    let taxonomyArr = {};
                    allTaxonomy.forEach(tx => {

                        let k = tx.TaxonomyId;

                        if (taxonomyArr[k]) {
                            taxonomyArr[k]['child'].push({
                                keyId: tx.SubTaxonomyId,
                                keyName: tx.TaxonomyName
                            })
                        }
                        else {
                            taxonomyArr[k] = {};
                            taxonomyArr[k]['keyId'] = tx.TaxonomyId;
                            taxonomyArr[k]['keyName'] = tx.TaxonomyName;
                            taxonomyArr[k]['child'] = [];

                            /* taxonomyArr[k]['child'].push({
                                keyId : tx.SubTaxonomyId,
                                keyName : tx.TaxonomyName
                            }) */
                        }
                    })

                    for (let i in taxonomyArr) {
                        taxonomyArr[i].child = lodash.orderBy(taxonomyArr[i].child, ['keyName'], ['asc'])
                        respData[0].taxonomyList.push(taxonomyArr[i])
                    }
                    respData[0].taxonomyList = lodash.orderBy(respData[0].taxonomyList, ['keyName'], ['asc'])
                }


                respData[0].availability = [
                    {
                        availabilityId: enums.employeeAvailability.Immediate.key,
                        availability: enums.employeeAvailability.Immediate.val
                    },
                    {
                        availabilityId: enums.employeeAvailability.TwoWeeksNotice.key,
                        availability: enums.employeeAvailability.TwoWeeksNotice.val
                    },
                    {
                        availabilityId: enums.employeeAvailability.ThreeWeeksNotice.key,
                        availability: enums.employeeAvailability.ThreeWeeksNotice.val
                    },
                    {
                        availabilityId: enums.employeeAvailability.FourWeeksNotice.key,
                        availability: enums.employeeAvailability.FourWeeksNotice.val
                    },
                    {
                        availabilityId: enums.employeeAvailability.OnProject.key,
                        availability: enums.employeeAvailability.OnProject.val
                    },
                    {
                        availabilityId: enums.employeeAvailability.Other.key,
                        availability: enums.employeeAvailability.Other.val
                    },
                ];

                respData[0].desiredEmployement = [
                    {
                        desiredEmployementKey: enums.desiredEmployement.Consulting.key,
                        desiredEmployement: enums.desiredEmployement.Consulting.val
                    },
                    {
                        desiredEmployementKey: enums.desiredEmployement.FullTime.key,
                        desiredEmployement: enums.desiredEmployement.FullTime.val
                    },
                    {
                        desiredEmployementKey: enums.desiredEmployement.RightToHire.key,
                        desiredEmployement: enums.desiredEmployement.RightToHire.val
                    }];

                respData[0]['projectEndingHelptext'] = [
                    {
                        keyId: 1,
                        keyName: 'Minimize downtime. Give us a Head\'s up as soon as you know.'
                    }
                ];

                respData[0]['jobSearchHelptext'] = [
                    {
                        keyId: 1,
                        keyName: 'Allow jobs to find you by changing your status to ACTIVE.'
                    }
                ];

                respData[0]['rtrHelp'] = [
                    {
                        keyId: 1,
                        keyName: 'This exclusive authorization will be effective for 90 days from today. <br> ' +
                            'By applying for this job through I agree to provide the exclusive Right to Represent me for this job with this company. ' +
                            'Should I be made an offer and be hired for this or any other position with the company posting this job, even if my resume or contact information has ' +
                            'been presented to this company by any other entity before or up to 90 days after this application, I agree to be represented by  and forego ' +
                            'any prior such authorization I may have signed beforehand. <br>' +
                            'If I have not been interviewed or been made an offer within 90 days by this company, this RTR will expire. If however, I have been interviewed and/or ' +
                            'been made an offer by the company within 90 days of this application, then irrespective of the date I join the company, this RTR will have been deemed ' +
                            'to be extended until I have joined the company. <br>' +
                            'If requested, I agree to provide signed documentation attesting to the above.'
                    }
                ];

                respData[0]['weekDays'] = [
                    {
                        keyId: 0, keyName: 'Sunday',
                    },
                    {
                        keyId: 1, keyName: 'Monday',
                    },
                    {
                        keyId: 2, keyName: 'Tuesday',
                    },
                    {
                        keyId: 3, keyName: 'Wednesday',
                    },
                    {
                        keyId: 4, keyName: 'Thursday',
                    },
                    {
                        keyId: 5, keyName: 'Friday',
                    },
                    {
                        keyId: 6, keyName: 'Saturday',
                    }
                ]

                userModel.geFunctionalAreaDepartmentAndIndustry('department')
                .then((departmentDetails) => {                    
                   respData[0].departmentList = departmentDetails;
                })
                .catch((error) => {
                    let resp = commonMethods.catchError('profile-management-controller/getAllLookups Other Information', error);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                })

                userModel.geFunctionalAreaDepartmentAndIndustry('industry')
                .then((industryDetails) => {                    
                   respData[0].empIndustryVerticalList = industryDetails;
                })
                .catch((error) => {
                    let resp = commonMethods.catchError('profile-management-controller/getAllLookups Other Information', error);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                })

                accountModel.getCompanyDetailById(config.masterParentCompanyId)
                .then((companyData) => {
                    if (companyData) {  
                        var allowedCompanies = companyData[0].AllowedCompanies.split(',').map(Number);
                        respData[0].allowedCompanies = allowedCompanies;
                    }
                })


                let timecardsModel = new TimecardsModel();
                timecardsModel.getAllStatusLookup(enums.appRefParentId.immigrationRateType)
                    .then((rateType) => {
                        respData[0].rateType = rateType;
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                        res.status(200).json(response);

                    })
                    .catch((error) => {
                        let resp = commonMethods.catchError('profile-management-controller/getAllLookups process.', error);
                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                        res.status(resp.code).json(response);
                    })

            })
            .catch((error) => {
                let resp = commonMethods.catchError('profile-management-controller/getAllLookups process.', error);
                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                res.status(resp.code).json(response);
            });
    }

    /**
     * Common methods for filter lookup data by key from procedure value
     * @param {*} collection 
     * @param {*} keyName 
     */
    filterLookupCollection(collection, keyName) {
        let out = [];
        out = lodash.filter(collection, (key) => {
            return key.KeyType === keyName;
        });
        out.forEach(item => {
            delete item.KeyType;
        })
        return out;
    }
    /**
     * Remove redis cache by key
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    getAllLookupsClear(req, res, next) {

        redis.del(REDIS_LOOKUPS_KEY, (error, reply) => {
            if (reply) {
                //logger.info("Redis key '", REDIS_LOOKUPS_KEY, "' successfully deleted.");

                /**
                 *  Build the responseTemplate and send back.. 
                 */
                res.status(200).send("Redis key '" + REDIS_LOOKUPS_KEY + "' successfully deleted.");
            } else {
                logger.error("Error deleting redis key. Key doesn't exist.");

                /**
                 *  Build the responseTemplate and send back..
                 */
                /* res.status(400).send(error);*/
                let resp = commonMethods.catchError('profile-management-controller/getAllLookupsClear process.');
                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                res.status(resp.code).json(response);
            }
        });
    }

    /**
     * reset emailid
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    resetEmail(req, res, next) {

        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId;
        let response = responseFormat.createResponseTemplate(),
            userName = req.body.userName,
            newEmailId = req.body.newEmailId,
            otpCode = req.body.otpCode,
            msgCode = [];

        msgCode = profileManagementValidation.resetEmailIdValidation(req.body);

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } else {
            /**
             * check User Name exists or not
             */
            accountModel.getUserByUserName(userName)
                .then((data) => {

                    if (data && data.length) {
                        accountModel.checkEmailExist(newEmailId)
                            .then((email) => {

                                if ((!email) || employeeDetailsId == email.EmployeeDetails_Id) {
                                    /**
                                     * verify otp
                                     */
                                    accountModel.verifyOTP(data[0].EmployeeDetails_Id, otpCode)
                                        .then((success) => {

                                            if (success.expire) {
                                                response = responseFormat.getResponseMessageByCodes(['otpCode:otpExpired'], { code: 417 });
                                                res.status(200).json(response);
                                            } else if (success.valid) {
                                                userModel.resetEmailId(req.body, employeeDetailsId)
                                                    .then((users) => {
                                                        /**
                                                         * send email
                                                         */
                                                        const emailModel = new EmailModel();
                                                        emailModel.sendMail(enums.emailTemplateEvents.emailEventAcknowledgement, data[0].First_Name, data[0].Email_Id, null, "Your Email Id has been changed successfully.");
                                                        response = responseFormat.getResponseMessageByCodes(['success:saved']);
                                                        res.status(200).json(response);

                                                    }).catch((error) => {
                                                        let resp = commonMethods.catchError('profile-management-controller/resetEmail process.', error);
                                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                        res.status(resp.code).json(response);
                                                    })
                                            } else {
                                                response = responseFormat.getResponseMessageByCodes(['otpCode:invalidOtp'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        })
                                        .catch((error) => {
                                            let resp = commonMethods.catchError('profile-management-controller/resetEmail process.', error);
                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                            res.status(resp.code).json(response);
                                        });
                                } else {
                                    response = responseFormat.getResponseMessageByCodes(['newEmailId:emailExists'], { code: 417 });
                                    res.status(200).json(response);
                                }
                            })
                            .catch((error) => {
                                let resp = commonMethods.catchError('profile-management-controller/resetEmail process.', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            });
                    } else {
                        response = responseFormat.getResponseMessageByCodes(['userName'], { code: 417 });
                        res.status(200).json(response);
                    }
                })
                .catch((error) => {
                    let resp = commonMethods.catchError('profile-management-controller/resetEmail process.', error);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                });
        }
    }

    /**
     * Delete Users
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    deleteUsersProfileData(req, res, next) {
        let response = responseFormat.createResponseTemplate(),
            employeeDetailsId = req.tokenDecoded.data.employeeDetailsId,
            msgCode = [],
            reqBody = {
                employeeEducationId: req.body.employeeEducationId,
                candidateEmploymentExperienceId: req.body.candidateEmploymentExperienceId,
                candidateDocId: req.body.candidateDocId,
                employeeLicenseId: req.body.employeeLicenseId,
                empCertificationDetailsId: req.body.empCertificationDetailsId,
                candidateSkillId: req.body.candidateSkillId,
                candidateAchievementId: req.body.candidateAchievementId,
                socialContactsId: req.body.socialContactsId
            };
        let resumeId = 0;
        msgCode = profileManagementValidation.deleteUsersValidation(reqBody);

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } else {
            // accountModel.getUserByUserName(employeeDetailsId)
            crudOperationModel.findAllByCondition(ResumeMaster, { employeeDetailsId: employeeDetailsId })
                .then((data) => {
                    if (data.length) {
                        resumeId = data[0].resumeId

                        // update resume master modified by column
                        crudOperationModel.saveModel(ResumeMaster, { modifiedBy: employeeDetailsId, modifiedOn: new Date() }, { resumeId: resumeId })
                            .then(del => {

                            })

                        if (reqBody.employeeEducationId) {
                            crudOperationModel.findModelByCondition(ResumeMaster, { employeeDetailsId: ~~employeeDetailsId })
                                .then(resume => {
                                    crudOperationModel.findModelByCondition(ResumeEducationDataType,
                                        {
                                            employeeEducationId: ~~reqBody.employeeEducationId,
                                            resumeId: resume.resumeId
                                        })
                                        .then((details) => {
                                            if (details) {
                                                crudOperationModel.deleteModel(ResumeEducationDataType, { employeeEducationId: reqBody.employeeEducationId })
                                                    .then(rs => {
                                                        response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                                        res.status(200).json(response);
                                                    }).catch((error) => {
                                                        let resp = commonMethods.catchError('profile-management-controller/deleteUsers employeeEducationId process.', error);
                                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                        res.status(resp.code).json(response);
                                                    })
                                            } else {
                                                response = responseFormat.getResponseMessageByCodes(['employeeEducationId'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        })
                                })
                        }
                        else if (reqBody.candidateEmploymentExperienceId) {
                            crudOperationModel.findModelByCondition(ResumeMaster,
                                {
                                    employeeDetailsId: ~~employeeDetailsId
                                })
                                .then(resume => {
                                    crudOperationModel.findModelByCondition(CandidateEmploymentExperience,
                                        {
                                            candidateEmploymentExperienceId: ~~reqBody.candidateEmploymentExperienceId,
                                            resumeId: resume.resumeId
                                        })
                                        .then((details) => {
                                            if (details) {
                                                crudOperationModel.deleteModel(CandidateEmploymentExperience, { candidateEmploymentExperienceId: reqBody.candidateEmploymentExperienceId })
                                                    .then(rs => {
                                                        response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                                        res.status(200).json(response);
                                                    }).catch((error) => {
                                                        let resp = commonMethods.catchError('profile-management-controller/deleteUsers candidateEmploymentExperienceId process.', error);
                                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                        res.status(resp.code).json(response);
                                                    })
                                            } else {
                                                response = responseFormat.getResponseMessageByCodes(['candidateEmploymentExperienceId'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        })
                                })
                        }
                        else if (reqBody.candidateDocId) {
                            crudOperationModel.findModelByCondition(ResumeMaster,
                                {
                                    employeeDetailsId: ~~employeeDetailsId
                                })
                                .then(resume => {
                                    crudOperationModel.findModelByCondition(Candidate_ResumeAndDoc,
                                        {
                                            candidateDocId: ~~reqBody.candidateDocId,
                                            resumeId: ~~resume.resumeId
                                        })
                                        .then((details) => {
                                            if (details) {                                                
                                                if (details.isPrimary == 0){
                                                    crudOperationModel.deleteModel(Candidate_ResumeAndDoc, { candidateDocId: reqBody.candidateDocId })
                                                    .then(rs => {                                                       
                                                        crudOperationModel.deleteModel(DMS, { dmsId: details.dmsId })
                                                        .then(resu => {                                                           
                                                            response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                                            res.status(200).json(response);
                                                        }).catch((error) => {
                                                            let resp = commonMethods.catchError('profile-management-controller/deleteUsers getResumeMasterByEmployeeDetailsId process.', error);
                                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                            res.status(resp.code).json(response);
                                                        })
                                                    }).catch((error) => {
                                                        let resp = commonMethods.catchError('profile-management-controller/deleteUsers getResumeMasterByEmployeeDetailsId process.', error);
                                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                        res.status(resp.code).json(response);
                                                    })
                                                }else{
                                                    response = responseFormat.getResponseMessageByCodes(['candidatePrimaryDocId'], { code: 417 });
                                                    res.status(200).json(response);
                                                }                                                
                                            } else {
                                                response = responseFormat.getResponseMessageByCodes(['candidateDocId'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        })
                                })
                        }
                        else if (reqBody.empCertificationDetailsId) {

                            crudOperationModel.findModelByCondition(EmployeeCertificationDetails,
                                {
                                    empCertificationDetailsId: ~~reqBody.empCertificationDetailsId,
                                    resumeId: resumeId
                                })
                                .then((details) => {

                                    if (details) {
                                        crudOperationModel.deleteModel(EmployeeCertificationDetails, { empCertificationDetailsId: reqBody.empCertificationDetailsId })
                                            .then(rs => {
                                                response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                                res.status(200).json(response);
                                            }).catch((error) => {
                                                let resp = commonMethods.catchError('profile-management-controller/deleteUsers empCertificationDetailsId process.', error);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })

                                    } else {
                                        response = responseFormat.getResponseMessageByCodes(['empCertificationDetailsId'], { code: 417 });
                                        res.status(200).json(response);
                                    }
                                })
                        }
                        else if (reqBody.candidateSkillId) {
                            crudOperationModel.findModelByCondition(CandidateSkills,
                                {
                                    candidateSkillId: ~~reqBody.candidateSkillId,
                                    resumeId: resumeId
                                })
                                .then((details) => {
                                    if (details) {

                                        crudOperationModel.deleteModel(CandidateSkills, { candidateSkillId: reqBody.candidateSkillId })
                                            .then(rs => {
                                                response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                                res.status(200).json(response);
                                            }).catch((error) => {
                                                let resp = commonMethods.catchError('profile-management-controller/deleteUsers candidateSkillId process.', error);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                res.status(resp.code).json(response);
                                            })

                                    } else {
                                        response = responseFormat.getResponseMessageByCodes(['candidateSkillId'], { code: 417 });
                                        res.status(200).json(response);
                                    }
                                })
                        }
                        else if (reqBody.candidateAchievementId) {
                            crudOperationModel.findModelByCondition(ResumeMaster,
                                {
                                    employeeDetailsId: ~~employeeDetailsId
                                })
                                .then(resume => {
                                    crudOperationModel.findModelByCondition(CandidateAchievement,
                                        {
                                            candidateAchievementId: ~~reqBody.candidateAchievementId,
                                            resumeId: resume.resumeId
                                        })
                                        .then((details) => {
                                            if (details) {

                                                crudOperationModel.deleteModel(CandidateAchievement, { candidateAchievementId: reqBody.candidateAchievementId })
                                                    .then(rs => {
                                                        response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                                        res.status(200).json(response);
                                                    }).catch((error) => {
                                                        let resp = commonMethods.catchError('profile-management-controller/deleteUsers candidateAchievementId process.', error);
                                                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                        res.status(resp.code).json(response);
                                                    })
                                            } else {
                                                response = responseFormat.getResponseMessageByCodes(['candidateAchievementId'], { code: 417 });
                                                res.status(200).json(response);
                                            }
                                        })
                                })
                        }
                        else if (reqBody.socialContactsId) {
                            crudOperationModel.deleteModel(SocialContacts, { socialContactsId: reqBody.socialContactsId })
                                .then(rs => {
                                    response = responseFormat.getResponseMessageByCodes(['success:deleted']);
                                    res.status(200).json(response);
                                })
                        }
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['errorText:invalidUser']);
                        res.status(200).json(response);
                    }

                })
                .catch((error) => {
                    let resp = commonMethods.catchError('profile-management-controller/resetEmail', error);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                });
        }
    }

    /**
     * Users List
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    mailTrainUserList(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        return userModel.getUserList()
            .then((respData) => {
                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                res.status(200).json(response);
            })
            .catch((error) => {
                let resp = commonMethods.catchError('profile-management-controller/getAllLookups process.', error);
                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                res.status(resp.code).json(response);
            });
    }


    filterDocumentType(collection) {
        let out = [];
        out = lodash.filter(collection, (key) => {
            return key;
        });
        out.forEach(item => {
            delete item.KeyType;
        })
        return out;
    }


    getProfileByGuid(req, res, next) {
        let response = responseFormat.createResponseTemplate();
        let authAccessToken = req.headers.authorizationToken;
        let employeeDetailsId = req.tokenDecoded.data.employeeDetailsId || 0;
        let guid = req.body.guid ? req.body.guid.trim() : '';
        let msgCode = [];
        let respData = [], promises = [];

        if (employeeDetailsId) {

            promises.push(userModel.getUserProfileById(employeeDetailsId, authAccessToken));
            promises.push(userModel.getAllProjects(employeeDetailsId));

            promises.push(candidateEmploymentExperienceModel.getCandidateEmploymentExperienceByEmployeeDetailsId(employeeDetailsId));
            promises.push(userModel.getUserResumeDocumentsByEmployeeId(employeeDetailsId));
            promises.push(skillDetailsModel.getSkillsByEmployeeDetailsId(employeeDetailsId));

            promises.push(summaryModel.getActiveApplicationsCount(employeeDetailsId));
            promises.push(jobsModel.getInteviewApplications(employeeDetailsId, 'upcomming'));

            Q.all(promises).spread(function (empDetails, allProjects, experiences, documents, skills, application, interview) {

                respData.push({
                    empDetails: empDetails,
                    experiences: experiences,
                    resume: documents.resume,
                    skills: skills,
                    allProjects: allProjects,
                    application: application,
                    interview: interview,
                    matchingJob: 0
                })
                respData[0].empDetails['onProject'] = empDetails.activeProjects < 1 ? 'no' : 'yes';

                let profileStrengthCount = commonMethods.calculateProfileStrength(respData);
                respData[0].empDetails.profileStrength = profileStrengthCount;


                // delete respData[0].empDetails.employeeType;

                if ([enums.employeeType.consultant, enums.employeeType.subContractor].indexOf(respData[0].empDetails.employeeTypeId) > -1) {
                    if (respData[0].allProjects.currentProjects.length) {
                        // respData[0].empDetails['employeeType'] = 'Employee';
                        respData[0].empDetails['project'] = {
                            id: respData[0].allProjects.currentProjects[0].projectDetailId,
                            title: respData[0].allProjects.currentProjects[0].projectName,
                            clientName: respData[0].allProjects.currentProjects[0].clientName,
                            startDate: respData[0].allProjects.currentProjects[0].startDate,
                            endDate: respData[0].allProjects.currentProjects[0].endDate
                        }
                    }
                    else if (respData[0].allProjects.oldProjects.length) {
                        let id = respData[0].allProjects.oldProjects.length - 1;

                        // respData[0].empDetails['employeeType'] = 'Ex-Employee';
                        respData[0].empDetails['project'] = {
                            id: respData[0].allProjects.oldProjects[id].projectDetailId,
                            title: respData[0].allProjects.oldProjects[id].projectName,
                            clientName: respData[0].allProjects.oldProjects[id].clientName,
                            startDate: respData[0].allProjects.oldProjects[id].startDate,
                            endDate: respData[0].allProjects.oldProjects[id].endDate
                        }
                    }
                    else {
                        // respData[0].empDetails['employeeType'] = 'Employee';
                        respData[0].empDetails['project'] = {}
                    }
                }
                else {
                    // respData[0].empDetails['employeeType'] = 'Job Seeker';
                    respData[0].empDetails['project'] = {}
                }


                // delete respData[0].allProjects;

                response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                res.status(200).json(response);
            });
        }
        else {
            response = responseFormat.getResponseMessageByCodes(['invalidAuthToken'], { code: 417 });
            res.status(200).json(response);
        }
    }

    getSubDomainByParent(req, res, next) {
        let domainId = ~~req.params.domainId;

        let response = responseFormat.createResponseTemplate();
        let msgCode = [];

        if (!domainId || domainId < 1) {
            msgCode.push('domainId');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            crudOperationModel.findAllByCondition(AppRefDataChild, { AppRefData_KeyId: domainId },
                ['keyId', 'appRefParentId', 'keyName'], ['keyName', 'ASC'])
                .then(resp => {
                    if (resp.length) {
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: resp } });
                        res.status(200).json(response);
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [] } });
                        res.status(200).json(response);
                    }
                }).catch(err => {
                    let resp = commonMethods.catchError('usersController/getSubDomainByParent', err);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                });
        }
    }

    matchingJobs(req, res, next) {
        let response = responseFormat.createResponseTemplate();
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
                        let employeeDetailsId = rs.employeeDetailsId;
                        this.getMarchingJob(employeeDetailsId, function (response) {
                            response = responseFormat.getResponseMessageByCodes('', { content: { dataList: [response] } });
                            res.status(200).json(response);
                        });
                    }
                    else {
                        response = responseFormat.getResponseMessageByCodes(['guid'], { code: 417 });
                        res.status(200).json(response);
                    }
                });
        }
    }

    getMarchingJob(employeeDetailsId, next) {
        
        let userDetail = {};
        let skillDetail = {};
        let searchData = this.searchData = {
            currentJobTitle: '',
            primarySkill: '',
            secondarySkill: '',
            location: '',
            desiredEmployement: '',

            packageType: '',
            minPackage: '',
            maxPackage: '',
            submit4APITaxonomy: ''
        };


        async.series([
            function (done) {
                userModel.getUserProfileById(employeeDetailsId)
                    .then(userDetail => {
                        if (userDetail) {
                            userDetail = userDetail;
                            done();
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:invalidUser'], { code: 417 });
                            res.status(200).json(response);
                        }
                    })
            },
            function (done) {
                skillDetailsModel.getSkillsByEmployeeDetailsId(employeeDetailsId)
                    .then(skillDetail => {
                        if (skillDetail) {
                            skillDetail = skillDetail;
                            done();
                        }
                        else {
                            response = responseFormat.getResponseMessageByCodes(['errorText:invalidUser'], { code: 417 });
                            res.status(200).json(response);
                        }
                    })
            },
            function (done) {
                jobsModel.getJobAlerts(employeeDetailsId, 'matching-jobs')
                    .then(jobAlerts => {

                        let submit4APITaxonomy = [];
                        if (jobAlerts.length) {
                            let matchingJobAlerts = jobAlerts[0].searchParameter;
                            let packageType, minPackage, maxPackage;
                            if (matchingJobAlerts['package']['type'] == 'annual') {
                                packageType = 'annual';
                                minPackage = matchingJobAlerts['package']['min'] ? matchingJobAlerts['package']['min'] : 0;
                                maxPackage = matchingJobAlerts['package']['max'] ? matchingJobAlerts['package']['max'] : 120;
                            } else {
                                packageType = 'hourly';
                                minPackage = matchingJobAlerts['package']['min'] ? matchingJobAlerts['package']['min'] : 0;
                                maxPackage = matchingJobAlerts['package']['max'] ? matchingJobAlerts['package']['max'] : 500;
                            }

                            // if(matchingJobAlerts['taxnomy4Alert'].length){
                            //     for (let txnomyItem of matchingJobAlerts['taxnomy4Alert']) {
                            //         submit4APITaxonomy.push({
                            //             'primary': txnomyItem.keyName,
                            //             'other': []
                            //         });
                            //     }
                            // }


                            searchData = {
                                jobTitle: matchingJobAlerts.jobTitle || '',
                                primarySkill: matchingJobAlerts.primarySkill || [],
                                secondarySkill: matchingJobAlerts.secondarySkill || [],
                                location: matchingJobAlerts.location || null,
                                radius: 200,
                                assignmentType: matchingJobAlerts.assignmentType || null,

                                package: {
                                    type: packageType,
                                    min: minPackage,
                                    max: maxPackage
                                },
                                submit4APITaxonomy: submit4APITaxonomy
                            }
                            done();
                        }
                        else {
                            let secondarySkill = [];
                            let primarySkill = [];
                            if (skillDetail.length) {
                                for (let skillItem of skillDetail) {
                                    if (skillItem.isPrimary == '1') {
                                        primarySkill.push(skillItem.skillName);
                                    }
                                }
                            }

                            let location = '';
                            for (let prefCity of userDetail.prefferedCity) {
                                location = prefCity;
                                break;
                            }


                            if (userDetail.taxonomy.length) {
                                for (let txItem of userDetail.taxonomy) {
                                    submit4APITaxonomy.push({
                                        'primary': txItem.keyName,
                                        'other': []
                                    });
                                }
                            }
                            searchData = {
                                jobTitle: userDetail.currentJobTitle || null,
                                primarySkill: primarySkill,
                                secondarySkill: secondarySkill,
                                location: location,
                                radius: 200,
                                assignmentType: userDetail.desiredEmployement,
                                package: {
                                    type: "hourly",
                                    min: 0,
                                    max: 500
                                },
                                submit4APITaxonomy: submit4APITaxonomy
                            }
                            done();
                        }
                    })
            },
            function (done) {
                // console.log('---------------------------------');
                // console.log(searchData);
                // console.log('---------------------------------');
                jobsModel.getMatchingJobs(employeeDetailsId, searchData)
                    .then(jobCount => {
                        if (jobCount) {
                            done();
                            next(jobCount);
                        }
                        else {
                            done();
                            next(0);
                        }

                    })
            }
        ]);

    }

    getOtherInformationDomainByParent(req, res, next) {
        let domainId = ~~req.params.domainId;
        let response = responseFormat.createResponseTemplate();
        let msgCode = [];
        let respData = [];

        if (!domainId || domainId < 1) {
            msgCode.push('domainId');
        }

        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        }
        else {
            userModel.getOtherInformationByDomainId(domainId)
                .then((domainDetails) => {                    
                    respData.push({
                        roles: domainDetails.roles,
                        primarySkills: domainDetails.primarySkills                       
                    });
                    response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                    res.status(200).json(response); 
                })
                .catch((error) => {
                    let resp = commonMethods.catchError('profile-management-controller/getOtherInformationDomainByParent Other Information', error);
                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                    res.status(resp.code).json(response);
                })
        }
    }
}