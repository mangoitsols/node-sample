/**
 *  -------Import all classes and packages -------------
 */
import fs from "fs";
import path from "path";
import logger from "../../core/logger";
import enums from '../../core/enums';
import configContainer from "../../config/localhost";
import CommonMethods from "../../core/common-methods";
import { dbContext, Sequelize } from "../../core/db";
import { UserLookups } from "../../entities/profileManagement/user-lookups";
import { EmployeeCertificationDetails } from "../../entities/profileManagement/employee-certification-details";
import { EmployeeEducationDetails } from "../../entities/profileManagement/employee-education-details";
import { Candidate_ResumeAndDoc } from "../../entities/profileManagement/candidate-resume-and-doc";
import { EmployeeLicense } from "../../entities/profileManagement/employee-license";
import { ResumeMaster } from "../../entities/profileManagement/resume-master";
import { EmployeeContactDetails } from "../../entities/profileManagement/employee-contact-details";
import { CandidateEmploymentExperience } from "../../entities/profileManagement/candidate-employment-experience";
import { ObjectMapper } from '../../core/objectMapper';
import { CandidateAchievement } from "../../entities/profileManagement/candidate-achievements";
import { JobResume } from "../../entities/jobs/job-resume";
import CrudOperationModel from '../../models/common/crud-operation-model';

import { AccountSignIn, UserSession, CountryList, StateList, CityList, APP_REF_DATA, EmployeeDetails } from "../../entities/index";

import SkillDetailsModel from '../../models/profileManagement/employee-skill-details-model';
import ChatModel from '../../models/chat/chat-model';
import { PtPlacementTracker } from "../../entities/employeeonboarding/pt-placementtracker";
import { PtProgressDetails } from "../../entities/employeeonboarding/pt-progress-details";

import EmployeeonboardingModel from '../../models/employeeonboarding/employeeonboarding-model';

import _ from "lodash";
import Q from "q";
import async from 'async';
import request from 'request';
import moment from 'moment';

/**
 *  -------Initialize global variabls-------------
 */
let config = configContainer.loadConfig();
let commonMethods = new CommonMethods(),
    crudOperationModel = new CrudOperationModel(),
    employeeonboardingModel = new EmployeeonboardingModel(),
    skillDetailsModel = new SkillDetailsModel(),
    chatModel = new ChatModel();

export default class UserModel {

    constructor() {
        //
    }

    /**
     * Get EmployeeContactDetails by EmployeeDetails id 
     * @param {*} employeeDetailsId : logged in employee details id
     */
    getEmployeeContactDetailsByEmployeeDetailsId(employeeDetailsId) {
        return EmployeeContactDetails.findOne({
            where: {
                EmployeeDetails_Id: employeeDetailsId
            },
            raw: true,
            attributes: [
                ["EmployeeDetails_Id", "employeeDetailsId"],
                ["Phone_Cell", "phoneCell"],
                ["Country", "country"],
                ["State", "state"],
                ["City_Id", "cityId"],
                ["Address1", "address"],
                ["Zip_Code", "zipCode"],
                ["Modified_By", "modifiedBy"],
                ["Modified_Date", "modifiedDate"]
            ]
        })
            .then((employeeContactDetails) => {
                employeeContactDetails = JSON.parse(JSON.stringify(employeeContactDetails).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                return employeeContactDetails;
            });
    }

    /**
     * Get ResumeMaster by EmployeeDetails id 
     * @param {*} employeeDetailsId : logged in employee details id
     */
    getResumeMasterByEmployeeDetailsId(employeeDetailsId) {
        return ResumeMaster.findOne({
            where: {
                FromEmployeeDetails_Id: employeeDetailsId
            },
            raw: true,
            attributes: [
                ["Resume_Id", "resumeId"],
                ["FromEmployeeDetails_Id", "employeeDetailsId"],
                ["Total_Exp", "totalExp"],
                ["TotalUSExp", "totalUsExp"],
                ["LinkedIn", "linkedIn"],
                ["Facebook", "facebook"],
                ["Twitter", "twitter"],
                ["GooglePlus", "googlePlus"],
                ["Comments", "comments"],
                ["JobSearchStatus", "jobSearchStatus"],
                ["Modified_By", "modifiedBy"],
                ["Modified_On", "modifiedOn"]
            ]
        })
            .then((resumeMaster) => {
                /**
                 * replace single quotes ,null, blank double quotes
                 */
                resumeMaster = JSON.parse(JSON.stringify(resumeMaster).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                return resumeMaster;
            });
    }

    /**
     * Get EmployeeDetails by EmployeeDetails id 
     * @param {*} employeeDetailsId : logged in employee details id 
     */
    getEmployeeDetailsByEmployeeDetailsId(employeeDetailsId) {
        return EmployeeDetails.findOne({
            where: {
                EmployeeDetails_Id: employeeDetailsId
            },
            raw: true,
            attributes: [
                ["EmployeeDetails_Id", "employeeDetailsId"],
                ["PJEmployee_Id", "employeeId"],
                ["First_Name", "firstName"],
                ["Last_Name", "lastName"],
                ["ProfilePicture", "profilePicture"],
                ["DOB", "dob"],
                ["CurrentJobTitle", "currentJobTitle"],
                ["LegalFilingStatus", "legalFilingStatus"],
                ["Modified_By", "modifiedBy"],
                ["Modified_Date", "modifiedDate"]
            ]
        })
            .then((empDetails) => {
                empDetails = JSON.parse(JSON.stringify(empDetails).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                return empDetails;
            })

    }

    /**
     * Get user lookUp data by parent id from APP_Reff_Data table
     * @param {*} parentId : logged in employee details id 
     */
    getUserLookupData(parentId) {
        return UserLookups.findAll({
            where: {
                ParentID: parentId,
                KeyID: { $ne: parentId }
            },
            attributes: [
                ["KeyID", "keyId"],
                ["KeyName", "keyName"],
                ["ParentID", "parentId"],
                ["Description", "description"],
                ["Value", "value"]
            ],
            order: [
                ['KeyName', 'ASC']
            ]
        })
            .then((AuthorizationStatus) => {
                return AuthorizationStatus;
            });
    }

    /**
     * Get users 
     * that are updated recently
     * for mailtrain db sync
     */
    getUserList() {
        var lastUpdated = new Date();
        lastUpdated.setDate(lastUpdated.getDate() - 30);
        return EmployeeDetails.findAll({
            where: {
                modifiedDate: { $gt: lastUpdated },
                employeeTypeId: enums.employeeType.inHouse
            },
            attributes: [
                ["EmployeeDetails_Id", "employeeDetailsId"],
                ["Email_Id", "emailId"],
                ["First_Name", "firstName"],
                ["Last_Name", "lastName"],
                ['emp_status', 'empStatus']
            ],
            order: [
                ['Modified_Date', 'DESC']
            ]
        })
            .then((users) => {
                return users;
            });
    }

    /**
     * Get user profile all lookup data
     */
    getProfileLookupData() {
        let query = "EXEC API_SP_GetProfileLookupData";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((dataList) => {
                return dataList;
            })
    }

    /**
     * get License By EmployeeDetailsId
     * @param {*} employeeDetailsId : logged in employee details id 
     */
    geEmployeementDetailsById(employeeDetailsId) {
        let query = "EXEC API_SP_GetEmployeementDetailsById @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }

    /**
     * get License By EmployeeDetailsId
     * @param {*} employeeDetailsId : logged in employee details id 
     */
    getLicenseByEmployeeDetailsId(employeeDetailsId) {
        let query = "EXEC API_SP_GetLicenseByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }



    /**
     * Get Certification By EmployeeDetailsId
     * @param {*} employeeDetailsId : logged in employee details id 
     */
    getCertificationByEmployeeDetailsId(employeeDetailsId) {
        let query = "EXEC API_SP_GetCertificationByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }
    /**
     * Get User Documents By EmployeeId
     * @param {*} employeeDetailsId : logged in employee details id 
     */
    getUserResumeDocumentsByEmployeeId(employeeDetailsId) {
        let resumeVars = enums.uploadType.userResume;
        let documentVars = enums.uploadType.userDocument;
        let query = "EXEC API_SP_GetEmployeeResumeDocumentsByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                let documents = [];
                let resume = [];
                let w9 = [];
                let interviewTemplate = [];
                if (details.length) {
                    details.forEach(function (item) {

                        if (item.docType == enums.uploadType.docTypes.resume) {
                            resume.push(
                                {
                                    candidateDocId: item.candidateDocId,
                                    fileName: item.fileName,
                                    filePath: (item.filePath) ? config.resumeHostUrl + config.documentBasePath + resumeVars.path + '/' + item.filePath : '',
                                    uploadedDate: item.uploadedDate
                                })
                        }
                        else if (item.docType == enums.uploadType.docTypes.other) {
                            documents.push(
                                {
                                    candidateDocId: item.candidateDocId,
                                    fileName: item.fileName,
                                    filePath: (item.filePath) ? config.documentHostUrl + config.documentBasePath + documentVars.path + '/' + item.filePath : '',
                                    uploadedDate: item.uploadedDate
                                })
                        }
                        else if (item.docType == enums.uploadType.docTypes.w9) {
                            w9.push(
                                {
                                    candidateDocId: item.candidateDocId,
                                    fileName: item.fileName,
                                    filePath: (item.filePath) ? config.documentHostUrl + config.documentBasePath + documentVars.path + '/' + item.filePath : '',
                                    uploadedDate: item.uploadedDate
                                })
                        }
                        else if (item.docType == enums.uploadType.docTypes.interviewTemplate) {
                            interviewTemplate.push(
                                {
                                    candidateDocId: item.candidateDocId,
                                    fileName: item.fileName,
                                    filePath: (item.filePath) ? config.documentHostUrl + config.documentBasePath + documentVars.path + '/' + item.filePath : '',
                                    uploadedDate: item.uploadedDate
                                })
                        }

                    });
                }
                return { documents: documents, resume: resume, w9: w9, interviewTemplate: interviewTemplate };
            })
    }

    /**
    * Get Candidate Achievement By employeeDetailsId
    * @param {*} employeeDetailsId : logged in employee details id 
    */

    getCandidateAchievementByEmployeeDetailsId(employeeDetailsId) {
        let query = "EXEC API_SP_GetCandidateAchievementByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch(err => {
                logger.error('Error has occured in profile-management-model/getCandidateAchievementByEmployeeDetailsId.', error);
                return null;
            })
    }

    /**
    * Get Candidate Taxonomy By employeeDetailsId
    * @param {*} employeeDetailsId : logged in employee details id 
    */

    getUserTaxonomy(employeeDetailsId) {
        let query = "EXEC API_SP_GetCandidateTaxonomyById @EmployeeDetails_Id=\'" + employeeDetailsId + "\'";

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {

                if (details.length) {
                    let outData = [];
                    let taxonomyArr = {};
                    details.forEach(tx => {

                        let k = tx.taxonomyId;

                        if (taxonomyArr[k]) {
                            if (tx.subTaxonomyId) {
                                taxonomyArr[k]['child'].push({
                                    keyId: tx.subTaxonomyId,
                                    keyName: tx.childTaxn
                                })
                            }
                        }
                        else {
                            taxonomyArr[k] = {};
                            taxonomyArr[k]['keyId'] = tx.taxonomyId;
                            taxonomyArr[k]['keyName'] = tx.parentTaxn;
                            taxonomyArr[k]['child'] = [];

                            if (tx.subTaxonomyId) {
                                taxonomyArr[k]['child'].push({
                                    keyId: tx.subTaxonomyId,
                                    keyName: tx.childTaxn
                                })
                            }
                        }
                    })

                    for (let i in taxonomyArr) {
                        taxonomyArr[i].child = _.orderBy(taxonomyArr[i].child, ['keyName'], ['asc'])
                        outData.push(taxonomyArr[i])
                    }


                    return _.orderBy(outData, ['keyName'], ['asc']);
                }
                else {
                    return [];
                }

            })
    }

    getUsersocialContacts(employeeDetailsId) {
        let query = "EXEC API_SP_GetCandidateSocialContacts @EmployeeDetails_Id=\'" + employeeDetailsId + "\'";

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }


    /**
     * Get UserProfile By EmployeeDetailsId
     * @param {*} employeeDetailsId : logged in employee details id 
     */
    getUserProfileById(employeeDetailsId, authAccessToken) {
        let envelopeId = 0;
        let placementTrackerId = 0;
        let onboardingComplete = 1;
        let offerPass = 1;
        let isOfferLetter = 1;

        return new Promise((resolve, reject) => {

            let userPictureVars = enums.uploadType.userPicture;
            let query = "EXEC API_SP_GetUserProfileById @EmployeeDetails_Id=\'" + employeeDetailsId + "\'";

            return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((det) => {

                    let emp = det[0];

                    let employment = emp.desiredEmployement ? (emp.desiredEmployement.split("|").map(item => { return item.trim() ? enums.desiredEmployement[item].val : '' })) : [];

                    emp.desiredEmployementKey = emp.desiredEmployementKey ? emp.desiredEmployementKey.split("|") : [];
                    emp.desiredEmployement = employment;
                    emp.prefferedCity = emp.prefferedCity ? emp.prefferedCity.split("||") : [];
                    emp['jobSeeker'] = emp.activeProjects < 1 ? true : false;

                    emp.profilePicture = (emp.profilePicture) ? config.documentHostUrl + config.documentBasePath + userPictureVars.path + '/' + emp.profilePicture : '';

                    emp.availability = emp.availability.trim() ? enums.employeeAvailability[emp.availability].val : '';
                    emp.recruiterDetails = {
                        id: emp.recId,
                        firstName: emp.recFirstName,
                        lastName: emp.recLastName,
                        emailId: emp.recEmailId,
                        profilePicture: (emp.recProfilePicture) ? config.documentHostUrl + config.documentBasePath + userPictureVars.path + '/' + emp.recProfilePicture : '',
                        contactNumber: emp.recContactNumber,
                        workExt: emp.workExt,
                    };
                    delete emp.recFirstName;
                    delete emp.recLastName;
                    delete emp.recEmailId;
                    delete emp.recProfilePicture;
                    delete emp.recContactNumber;

                    if (!emp.jobSeeker) {
                        let query = "EXEC API_SP_GetEmployeeProjects @EmployeeDetailsId=\'" + employeeDetailsId + "\', @IsCurrentProject=\'" + 1 + "\' ";
                        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                            .then((proj) => {
                                if (proj.length) {
                                    let endDate = proj.filter(item => {
                                        return moment(new Date(item.projectEndDate)).isAfter(new Date(item.startDate), 'day') ? item.projectEndDate : false;
                                    });

                                    emp.jobSeeker = endDate.length == proj.length ? true : false;

                                    // resolve(emp);
                                    return emp;
                                }
                                else {
                                    // resolve(emp);
                                    return emp;
                                }
                            })
                    }
                    else {
                        // resolve(emp);
                        return emp;
                    }
                })
                .then(emp => { // SHARAD - companyDetails

                    let companyMasterId = emp.companyMasterId == 3 ? enums.compnayMaster.default : emp.companyMasterId;
                    let query1 = "EXEC API_SLP_GetCompanyDetailById @masterCompanyId = " + companyMasterId + " ";

                    return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                        .then(pt => {
                            if (pt.length) {
                                emp['companyDetails'] = pt[0];
                            }
                            else {
                                emp['companyDetails'] = {};
                            }
                            return emp;
                        })
                })
                .then(emp => {

                    return new Promise((rsle, rjct) => {
                        // if (emp.employeeTypeId == enums.employeeType.jobSeeker || emp.employeeTypeId == enums.employeeType.consultant) {
                        if (emp.employeeTypeId != enums.employeeType.inHouse) {    
                            
                            chatModel.getPlacementStatus(emp.resumeId)
                                .then(ptDetail => {
                                    if (ptDetail) {
                                        crudOperationModel.findModelByCondition(PtPlacementTracker, {
                                            placementTrackerId: ptDetail[0].placementTrackerId
                                        })
                                            .then(ptTracker => {
                                                if (ptTracker) {

                                                    crudOperationModel.findModelByCondition(PtProgressDetails, {
                                                        placementTrackerId: ptDetail[0].placementTrackerId,
                                                        placementStatus: { $ne: 2 },
                                                    })
                                                        .then(PtProgressDetails => {
                                                            if (PtProgressDetails) {
                                                                //0 = consultant and 1 = sun contrator
                                                                if (ptTracker.consultantType == 0) {
                                                                    emp.employeeTypeId = enums.employeeType.consultant;
                                                                    emp.employeeType = enums.employeeTypeName.consultant;
                                                                }
                                                                else if (ptTracker.consultantType == 1) {
                                                                    emp.employeeTypeId = enums.employeeType.subContractor;
                                                                    emp.employeeType = enums.employeeTypeName.subContractor;
                                                                }
                                                                rsle(emp);
                                                            }
                                                            else {
                                                                rsle(emp);
                                                            }
                                                        });
                                                }
                                                else {
                                                    rsle(emp);
                                                }
                                            });
                                    }
                                    else {
                                        rsle(emp);
                                    }
                                });
                        }
                        else {
                            rsle(emp);
                        }
                    });
                })
                .then(emp => {
                    // crudOperationModel.findModelByCondition(JobResume, {candidateResumeId: emp.resumeId, placementTrackerId : { $ne : null}})
                    let query1 = "EXEC API_SP_GetPlacements @ResumeId = " + emp.resumeId + " ";

                    return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                        .then(pt => {
                            if (pt.length) {
                                let comp = pt.filter(itm => {
                                    return itm.placementStatus == 3;
                                });

                                emp['empOnboardingStatus'] = comp.length ? 'Completed' : 'Pending';
                            }
                            else {
                                emp['empOnboardingStatus'] = 'Not applicable';
                            }


                            return emp;
                        })

                        .then(emp => {

                            let query1 = "EXEC API_SP_GetCandidateOfferLetter @EmployeeDetails_Id = " + employeeDetailsId + " ";

                            return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                                .then((rs) => {                                   
                                    envelopeId = rs.length ? rs[0].envelopeId : 0;
                                    placementTrackerId = rs.length ? rs[0].placementTrackerId : 0;

                                    let offerLetterVars = enums.uploadType.offerLetter;
                                    let addendumLetterVars = enums.uploadType.addendumLetter;

                                    //let docPath = config.portalHostUrl + config.documentBasePath + offerLetterVars.path + '/';
                                    //let addendumDocPath = config.portalHostUrl + config.documentBasePath + addendumLetterVars.path + '/';
                                    
                                    let docPath = config.dmsDocumentUrl;
                                    let addendumDocPath = config.dmsDocumentUrl;

                                    emp['empOnboardingDocStatus'] = 'Not applicable';
                                    emp['empOnboardingStatus'] = emp['empOnboardingStatus'] ? emp['empOnboardingStatus'] : 'Pending';
                                    emp['employeeOnboarding'] = {
                                        onboarding: rs.length ? 1 : 0,
                                        offerLetter: rs.length && rs[0].offerLetterId && rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.sent ? 1 : 0,
                                        callSignUrl: 0,
                                        step: 0,
                                        stepName: '',
                                        stages: [],
                                        viewed: 0,
                                        envType: 0,
                                        startDate: rs.length ? rs[0].startDate : ''
                                    };

                                    if (!rs.length || rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.pending || rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.inprocess) {
                                        isOfferLetter = 0;
                                    }
                                    if (rs.length
                                        && (rs[0].offerLetterStatus != enums.helloSign.offerLetterStatus.na
                                            && (rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.sent || rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.completed))) {
                                        emp.employeeOnboarding.stages.push({
                                            title: 'Offer Letter',  
                                            status: rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.completed ? 'ACCEPTED' : 'PENDING',
                                            //path: rs[0].isAccepted && rs[0].offerLetterName ? docPath + rs[0].offerLetterName : '',
                                            path: rs[0].isAccepted && rs[0].offerLetterName ? docPath + rs[0].dmsId+'?slp='+authAccessToken : '',
                                            step: 0,
                                            callSignUrl: 0,
                                            isComplete: rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.sent ? 0 : 1,
                                            envelopeTypeId: 0,
                                            info: '',
                                            envId: 0
                                        })

                                        if (rs[0].addendumLetterName) {
                                            emp.employeeOnboarding.stages.push({
                                                title: 'Addendum Letter',
                                                status: '',
                                                //path: rs[0].addendumLetterName ? addendumDocPath + rs[0].addendumLetterName : '',
                                                path: rs[0].addendumLetterName ? addendumDocPath + rs[0].dmsId+'?slp='+authAccessToken : '',
                                                step: 0,
                                                callSignUrl: 0,
                                                isComplete: 1,
                                                envelopeTypeId: 0,
                                                info: '',
                                                envId: 0
                                            })
                                        }

                                        onboardingComplete = rs[0].offerLetterStatus != enums.helloSign.offerLetterStatus.completed ? 0 : onboardingComplete;
                                        offerPass = rs[0].offerLetterStatus == enums.helloSign.offerLetterStatus.completed ? 1 : 0;
                                    }

                                    return emp;
                                })
                                .then(emp => {
                                    employeeonboardingModel.callSignUrl(employeeDetailsId)
                                        .then(rs => {
                                            emp.employeeOnboarding.callSignUrl = offerPass ? rs.callSignUrl : 0;
                                            emp.employeeOnboarding.step = rs.step;
                                            emp.employeeOnboarding.viewed = rs.viewed ? 1 : 0;
                                            emp.employeeOnboarding.attachments = [];
                                            emp.employeeOnboarding.envType = rs.envTemplatedId;
                                            emp.employeeOnboarding.stepName = rs.envelopeType;
                                            return emp;
                                        })
                                        .then(emp => {
                                            let query1 = "EXEC API_SP_GetDocumentForEnvelope @placementTrackerId = " + placementTrackerId + " ";
                                            return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                                                .then((rs1) => {
                                                    let uploadedDocCount = 0;
                                                    let empVars = enums.uploadType.employeeDocs;
                                                    let ptVars = enums.uploadType.ptDocs;
                                                    let basePath = config.dmsDocumentUrl;
                                                    //let basePath = config.portalHostUrl + config.documentBasePath + empVars.path + '/' + employeeDetailsId + '/';
                                                    rs1.forEach(item => {                                                        
                                                        item['docPath'] = item.dmsId ? basePath + item.dmsId+'?slp='+authAccessToken : '';
                                                        uploadedDocCount = item.dmsId ? ++uploadedDocCount : uploadedDocCount;
                                                    })
                                                    onboardingComplete = uploadedDocCount != rs1.length ? 0 : onboardingComplete;
                                                    if (rs1.length) {
                                                        emp['empOnboardingDocStatus'] = uploadedDocCount == rs1.length ? 'Completed' : 'Pending';
                                                    }

                                                    // emp.employeeOnboarding.attachments = rs1.length && emp.employeeOnboarding.envType == enums.helloSign.envelopeType.clientDoc ? rs1 : [];
                                                    emp.employeeOnboarding.attachments = rs1.length ? rs1 : [];
                                                    return emp;
                                                })
                                                .then(emp => {
                                                    let query1 = "EXEC API_SP_GetEnvelopesByPlacementTrackerId @placementTrackerId = " + placementTrackerId + " ";
                                                    return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                                                        .then((rs2) => {
                                                            if (rs2.length) {

                                                                let o = [];

                                                                for (let i in rs2) {
                                                                    let item = rs2[i];
                                                                    let fileUrl = '';// item.path ? 'https://'+config.helloSign.apiKey+':@api.hellosign.com'+(item.path.replace(/final_copy/g, "files")) : '';
                                                                    let message = 'Awaiting Signature';
                                                                    let info = '';

                                                                    if (item.envelopeStatus == enums.helloSign.envelopStatus.completed) {
                                                                        message = 'COMPLETED';
                                                                    }
                                                                    else if (item.signed) {
                                                                        message = 'SIGNED'
                                                                    }
                                                                    else if (!item.signer) {
                                                                        message = 'Awaiting signature';
                                                                    }

                                                                    if (item.envelopeTypeId == enums.helloSign.envelopeType.bgCheck && item.bg != 0) {
                                                                        onboardingComplete = !item.signed && item.envelopeStatus != enums.helloSign.envelopStatus.completed ? 0 : onboardingComplete;
                                                                        message = item.envelopeStatus == enums.helloSign.envelopStatus.completed ? 'COMPLETED' : message;
                                                                        info = (!item.signed && item.signerOrder > 1) && !item.otherSigned ? 'Awaiting ' + item.signerRole.toLowerCase() + ' signature' : '';
                                                                        let callSignUrl = 0;
                                                                        if (offerPass && (item.signerOrder == 1 && !item.signed) && item.envelopeStatus != enums.helloSign.envelopStatus.completed) {
                                                                            callSignUrl = 1;
                                                                        }
                                                                        // else if(item.signerOrder == 1 && item.signed)
                                                                        // {
                                                                        //     callSignUrl = 0;
                                                                        // }
                                                                        // else if( item.signerOrder > 1 && !item.otherSigned )
                                                                        // {
                                                                        //     callSignUrl = 0;
                                                                        // }
                                                                        else if ((item.signerOrder > 1 && item.otherSigned) && !item.signed) {
                                                                            callSignUrl = 1;
                                                                        }

                                                                        o.push({
                                                                            title: item.envelopeType,
                                                                            status: message,
                                                                            path: fileUrl,
                                                                            step: item.envelopeOrder,
                                                                            isComplete: item.signed || item.envelopeStatus == enums.helloSign.envelopStatus.completed ? 1 : 0,
                                                                            callSignUrl: callSignUrl,
                                                                            envelopeTypeId: item.envelopeTypeId,
                                                                            info: info,
                                                                            envId: item.envId
                                                                        })
                                                                    }
                                                                    if (item.envelopeTypeId == enums.helloSign.envelopeType.clientDoc && item.ct != 0) {
                                                                        let callSignUrl = 0;
                                                                        if (offerPass && (item.signerOrder == 1 && !item.signed) && item.envelopeStatus != enums.helloSign.envelopStatus.completed) {
                                                                            callSignUrl = 1;
                                                                        }
                                                                        else if ((item.signerOrder > 1 && item.otherSigned) && !item.signed) {
                                                                            callSignUrl = 1;
                                                                        }
                                                                        onboardingComplete = !item.signed && item.envelopeStatus != enums.helloSign.envelopStatus.completed ? 0 : onboardingComplete;
                                                                        info = (!item.signed && item.signerOrder > 1) && !item.otherSigned ? 'Awaiting ' + item.signerRole.toLowerCase() + ' signature' : '';
                                                                        o.push({
                                                                            title: item.envelopeType,
                                                                            status: message,
                                                                            path: fileUrl,
                                                                            step: item.envelopeOrder,
                                                                            isComplete: item.signed || item.envelopeStatus == enums.helloSign.envelopStatus.completed ? 1 : 0,
                                                                            callSignUrl: callSignUrl,
                                                                            envelopeTypeId: item.envelopeTypeId,
                                                                            info: info,
                                                                            envId: item.envId
                                                                        })
                                                                    }
                                                                    if (item.envelopeTypeId == enums.helloSign.envelopeType.benefit && item.benefit != 0) {
                                                                        onboardingComplete = !item.signed && item.envelopeStatus != enums.helloSign.envelopStatus.completed && item.benefitStatus != enums.helloSign.benefitStatus.ni ? 0 : onboardingComplete;
                                                                        message = item.benefitStatus == enums.helloSign.benefitStatus.ni ? 'NOT INTERESTED' : message;

                                                                        info = (!item.signed && item.signerOrder > 1) && !item.otherSigned ? 'Awaiting ' + item.signerRole.toLowerCase() + ' signature' : '';

                                                                        let callSignUrl = 0;
                                                                        if (item.benefitStatus != enums.helloSign.benefitStatus.ni) {
                                                                            if (offerPass && (item.signerOrder == 1 && !item.signed) && item.envelopeStatus != enums.helloSign.envelopStatus.completed) {
                                                                                callSignUrl = 1;
                                                                            }
                                                                            else if ((item.signerOrder > 1 && item.otherSigned) && !item.signed) {
                                                                                callSignUrl = 1;
                                                                            }
                                                                        }

                                                                        o.push({
                                                                            title: item.envelopeType,
                                                                            status: message,
                                                                            path: fileUrl,
                                                                            step: item.envelopeOrder,
                                                                            isComplete: item.signed || item.benefitStatus == enums.helloSign.benefitStatus.ni || item.envelopeStatus == enums.helloSign.envelopStatus.completed ? 1 : 0,
                                                                            callSignUrl: callSignUrl,
                                                                            envelopeTypeId: item.envelopeTypeId,
                                                                            info: info,
                                                                            envId: item.envId
                                                                        })
                                                                    }
                                                                }

                                                                // check onboarding completed if all step signed and all document uploaded
                                                                if (emp.employeeOnboarding.onboarding) {
                                                                    emp.employeeOnboarding.onboarding = ~~!onboardingComplete && isOfferLetter;
                                                                    if (emp.employeeOnboarding.onboarding) {
                                                                        emp['empOnboardingStatus'] = 'Pending';
                                                                    } else {
                                                                        emp['empOnboardingStatus'] = 'Completed';
                                                                    }
                                                                }

                                                                Array.prototype.push.apply(emp.employeeOnboarding.stages, o);
                                                                resolve(emp);
                                                            }
                                                            else {
                                                                if (emp.employeeOnboarding.onboarding) {
                                                                    emp.employeeOnboarding.onboarding = ~~!onboardingComplete && isOfferLetter;

                                                                    if (emp.employeeOnboarding.onboarding) {
                                                                        emp['empOnboardingStatus'] = 'Pending';
                                                                    } else {
                                                                        emp['empOnboardingStatus'] = 'Completed';
                                                                    }
                                                                }
                                                                resolve(emp)
                                                            }
                                                        })
                                                })
                                        })
                                })
                        })

                })


        })

    }



    getAllProjects(employeeDetailsId) {
        return new Promise(resolve => {

            let query = "EXEC API_SP_GetEmployeeProjects @EmployeeDetailsId=\'" + employeeDetailsId + "\', @IsCurrentProject=\'" + 1 + "\' ";
            return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((rs) => {
                    let query1 = "EXEC API_SP_GetEmployeeProjects @EmployeeDetailsId=\'" + employeeDetailsId + "\', @IsCurrentProject=\'" + 0 + "\' ";
                    return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                        .then((rs1) => {
                            return resolve({ currentProjects: rs, oldProjects: rs1 });
                        })
                })
        })
    }



    /**
     * update operation in  employee  details
     * @param {*} employeeDetailsId : logged in employee id
     * @param {*} empDetails : details object
     */
    updateEmployeeDetails(employeeDetailsId, empdetails) {
        return new Promise((resolve, reject) => {
            if (employeeDetailsId && employeeDetailsId > 0) {

                EmployeeDetails.find({ where: [{ EmployeeDetails_Id: employeeDetailsId }] })
                    .then((empDetails) => {
                        if (empDetails) {
                            return ObjectMapper(empdetails, empDetails.dataValues)
                                .then((data) => {

                                    EmployeeDetails.update(data, { where: [{ EmployeeDetails_Id: employeeDetailsId }] })
                                        .then((response) => {
                                            resolve('Record Updated')
                                        })
                                        .catch((error) => {
                                            reject('Error on updating record');
                                        })
                                })

                        } else {
                            reject('No record found on requested id')
                        }
                    })
            } else {
                reject(null);
            }
        })
    }




    /**
     * CUD operation in  employee Licenses details
     * @param {*} employeeDetailsId
     * @param {*} licensesList
     */
    manageLicensesDetails(employeeDetailsId, licensesList) {
        let response = {};
        licensesList.forEach(function (data) {
            let employeeLicenseId = data.employeeLicenseId,
                licenseTypeId = data.licenseTypeId,
                registeredStateId = data.registeredStateId,
                licenceNumber = data.licenceNumber,
                expirationDate = data.expirationDate,
                action = data.action.toLowerCase(),

                newObj = {
                    EmployeeDetails_Id: employeeDetailsId,
                    LicenseType: licenseTypeId,
                    RegisteredState: registeredStateId,
                    LicenceNumber: licenceNumber,
                    ExpirationDate: expirationDate
                };

            /**
             * create new records
             */
            if (action == "c") {
                newObj.IsActive = 1;
                newObj.CreatedBy = employeeDetailsId;
                newObj.CreatedDate = new Date();

                return EmployeeLicense.create(newObj)
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageLicensesDetails Create process.", error);
                        response.msgCode = "errorLicensesSave";
                        response.isSuccess = false;
                        return response;
                    });
            }

            /**
             * Update existing record
             */
            else if (action == "u") {

                /**
                 * get data by id
                 */
                return EmployeeLicense.findOne({
                    where: {
                        EmployeeLicense_Id: employeeLicenseId
                    },
                    raw: true,
                })
                    .then((data) => {
                        data = JSON.parse(JSON.stringify(data).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                        newObj.LicenseType = (newObj.LicenseType) ? newObj.LicenseType : (newObj.LicenseType == "") ? newObj.LicenseType = "" : data.LicenseType;
                        newObj.RegisteredState = (newObj.RegisteredState) ? newObj.RegisteredState : (newObj.RegisteredState == "") ? newObj.RegisteredState = "" : data.RegisteredState;
                        newObj.LicenceNumber = (newObj.LicenceNumber) ? newObj.LicenceNumber : (newObj.LicenceNumber == "") ? newObj.LicenceNumber = "" : data.LicenceNumber;
                        newObj.ExpirationDate = (newObj.ExpirationDate) ? newObj.ExpirationDate : (newObj.ExpirationDate == "") ? newObj.ExpirationDate = "" : data.ExpirationDate;

                        return EmployeeLicense.update(newObj,
                            { where: { EmployeeLicense_Id: employeeLicenseId } }
                        )
                            .then((det) => {
                                response.isSuccess = true;
                                return response;
                            })
                            .catch((error) => {
                                logger.error("Error has occured in profile-management-model/manageLicensesDetails update process.", error);
                                response.msgCode = "errorLicensesSave";
                                response.isSuccess = false;
                                return response;
                            });
                    });
            }

            /**
             * Delete existing record // if (action == "d")
             */
            else if (action == "d") {
                return EmployeeLicense.destroy(
                    { where: { EmployeeLicense_Id: employeeLicenseId } }
                )
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageLicensesDetails delete process.", error);
                        response.msgCode = "errorLicensesSave";
                        response.isSuccess = false;
                        return response;
                    });
            }
        });
    }

    /**
     * CUD operation in employee certification details
     * @param {*} employeeDetailsId :logged in employee details id
     * @param {*} certificationList
     */
    manageCertificationDetails(employeeDetailsId, certificationList) {
        let response = {};
        certificationList.forEach(function (data) {

            let empCertificationDetailsId = data.empCertificationDetailsId,
                certificateName = data.certificateName,
                issuedBy = data.issuedBy,
                expirationDate = data.expirationDate,
                action = data.action.toLowerCase(),

                newObj = {
                    EmployeeDetails_Id: employeeDetailsId,
                    CertificateExam_Name: certificateName,
                    Institution_Name: issuedBy,
                    ExpiryRenewal_Date: expirationDate,
                    Modified_By: employeeDetailsId,
                    Modified_Date: new Date()
                };

            /**
             * create new records
             */
            if (action == "c") {
                newObj.Status = 1;
                newObj.Created_By = employeeDetailsId;
                newObj.Created_Date = new Date();

                return EmployeeCertificationDetails.create(newObj)
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageCertificationDetails Create process.", error);
                        response.msgCode = "errorCertificationsSave";
                        response.isSuccess = false;
                        return response;
                    });
            }

            /**
             * Update existing record
             */
            else if (action == "u") {

                /**
                 * get data by id
                 */
                return EmployeeCertificationDetails.findOne({
                    where: {
                        EmpCertificationDetails_Id: empCertificationDetailsId
                    },
                    raw: true,
                })
                    .then((data) => {
                        data = JSON.parse(JSON.stringify(data).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                        newObj.CertificateExam_Name = (newObj.CertificateExam_Name) ? newObj.CertificateExam_Name : (newObj.CertificateExam_Name == "") ? newObj.CertificateExam_Name = "" : data.CertificateExam_Name;
                        newObj.Institution_Name = (newObj.Institution_Name) ? newObj.Institution_Name : (newObj.Institution_Name == "") ? newObj.Institution_Name = "" : data.Institution_Name;
                        newObj.ExpiryRenewal_Date = (newObj.ExpiryRenewal_Date) ? newObj.ExpiryRenewal_Date : (newObj.ExpiryRenewal_Date == "") ? newObj.ExpiryRenewal_Date = "" : data.ExpiryRenewal_Date;

                        return EmployeeCertificationDetails.update(newObj,
                            { where: { EmpCertificationDetails_Id: empCertificationDetailsId } }
                        )
                            .then((det) => {
                                response.isSuccess = true;
                                return response;
                            })
                            .catch((error) => {
                                logger.error("Error has occured in profile-management-model/manageCertificationDetails update process.", error);
                                response.msgCode = "errorCertificationsSave";
                                response.isSuccess = false;
                                return response;
                            });
                    });
            }

            /**
             * Delete existing record // if (action == "d")
             */
            else if (action == "d") {
                return EmployeeCertificationDetails.destroy(
                    { where: { EmpCertificationDetails_Id: empCertificationDetailsId } }
                )
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageCertificationDetails delete process.", error);
                        response.msgCode = "errorCertificationsSave";
                        response.isSuccess = false;
                        return response;
                    });
            }
        });
    }

    /**
     * CUD operation in employee educationList details
     * @param {*} employeeDetailsId : logged in employee details id
     * @param {*} educationList
     */
    manageEducationListDetails(employeeDetailsId, educationList) {
        let response = {};
        educationList.forEach(function (data) {

            let employeeEducationId = data.employeeEducationId,
                degreeId = data.degreeId,
                collegeOrSchool = data.collegeOrSchool,
                countryId = data.countryId,
                attendedFrom = data.attendedFrom,
                attendedTo = data.attendedTo,
                action = data.action.toLowerCase(),

                newObj = {
                    EmployeeDetails_Id: employeeDetailsId,
                    Qualification: degreeId,
                    Institution_Name: collegeOrSchool,
                    Country_Id: countryId,
                    Attended_From: new Date(attendedFrom + "-01-01"),
                    Attended_To: new Date(attendedTo + "-01-01"),
                    Modified_By: employeeDetailsId,
                    Modified_Date: new Date()
                };

            /**
             * create new records
             */
            if (action == "c") {
                newObj.Created_By = employeeDetailsId;
                newObj.Created_Date = new Date();
                return EmployeeEducationDetails.create(newObj)
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageEducationListDetails Create process.", error);
                        response.msgCode = "errorEducationsSave";
                        response.isSuccess = false;
                        return response;
                    });
            }

            /**
             * Update existing record
             */
            else if (action == "u") {
                return EmployeeEducationDetails.findOne({
                    where: {
                        EmployeeEducation_Id: employeeEducationId
                    },
                    raw: true,
                })
                    .then((data) => {
                        data = JSON.parse(JSON.stringify(data).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                        newObj.Qualification = (newObj.Qualification) ? newObj.Qualification : (newObj.Qualification == "") ? newObj.Qualification = "" : data.Qualification;
                        newObj.Institution_Name = (newObj.Institution_Name) ? newObj.Institution_Name : (newObj.Institution_Name == "") ? newObj.Institution_Name = "" : data.Institution_Name;
                        newObj.Country_Id = (newObj.Country_Id) ? newObj.Country_Id : (newObj.Country_Id == "") ? newObj.Country_Id = "" : data.Country_Id;
                        newObj.Attended_From = (newObj.Attended_From) ? newObj.Attended_From : (newObj.Attended_From == "") ? newObj.Attended_From = "" : data.Attended_From;
                        newObj.Attended_To = (newObj.Attended_To) ? newObj.Attended_To : (newObj.Attended_To == "") ? newObj.Attended_To = "" : data.Attended_To;

                        return EmployeeEducationDetails.update(newObj,
                            { where: { EmployeeEducation_Id: employeeEducationId } }
                        )
                            .then((det) => {
                                response.isSuccess = true;
                                return response;
                            })
                            .catch((error) => {
                                logger.error("Error has occured in profile-management-model/manageEducationListDetails update process.", error);
                                response.msgCode = "errorEducationsSave";
                                response.isSuccess = false;
                                return response;
                            });
                    });
            }

            /**
             * Delete existing record // if (action == "d")
             */
            else if (action == "d") {
                return EmployeeEducationDetails.destroy(
                    { where: { EmployeeEducation_Id: employeeEducationId } }
                )
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageEducationListDetails delete process.", error);
                        response.msgCode = "errorEducationsSave";
                        response.isSuccess = false;
                        return response;
                    });
            }
        });
    }


    /**
     * CUD operation in employee documents details
     * @param {*} employeeDetailsId : logged in employee details Id
     * @param {*} documentList
     */
    manageDocumentsListDetails(employeeDetailsId, documentList) {
        let response = {};
        documentList.forEach(function (data) {
            let candidateDocId = data.candidateDocId,
                action = data.action.toLowerCase(),
                newObj = {
                    Resume_Id: data.Resume_Id,
                    Resume_File: data.Resume_File,
                    File_name: data.File_name,
                    Modified_By: employeeDetailsId,
                    Modified_Date: new Date()
                };
            /**
             * create new records
             */
            if (action == "c") {
                newObj.Created_By = employeeDetailsId;
                newObj.Created_Date = new Date();
                return Candidate_ResumeAndDoc.create(newObj)
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageDocumentsListDetails Create process.", error);
                        response.msgCode = "errorDocumentsSave";
                        response.isSuccess = false;
                        return response;
                    });
            }

            /**
             * Update existing record
             */
            else if (action == "u") {
                return Candidate_ResumeAndDoc.findOne({
                    where: {
                        CandidateDoc_Id: candidateDocId
                    },
                    raw: true,
                })
                    .then((data) => {
                        data = JSON.parse(JSON.stringify(data).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                        newObj.Resume_Id = (newObj.Resume_Id) ? newObj.Resume_Id : (newObj.Resume_Id == "") ? newObj.Resume_Id = "" : data.Resume_Id;
                        newObj.Resume_File = (newObj.Resume_File) ? newObj.Resume_File : (newObj.Resume_File == "") ? newObj.Resume_File = "" : data.Resume_File;
                        newObj.File_name = (newObj.File_name) ? newObj.File_name : (newObj.File_name == "") ? newObj.File_name = "" : data.File_name;

                        return Candidate_ResumeAndDoc.update(newObj,
                            { where: { CandidateDoc_Id: candidateDocId } }
                        )
                            .then((det) => {
                                response.isSuccess = true;
                                return response;
                            })
                            .catch((error) => {
                                logger.error("Error has occured in profile-management-model/manageDocumentsListDetails update process.", error);
                                response.msgCode = "errorDocumentsSave";
                                response.isSuccess = false;
                                return response;
                            });
                    });
            }

            /**
             * Delete existing record
             */
            else if (action == "d") {
                return Candidate_ResumeAndDoc.destroy(
                    { where: { CandidateDoc_Id: candidateDocId } }
                )
                    .then((det) => {
                        response.isSuccess = true;
                        return response;
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/manageDocumentsListDetails delete process.", error);
                        response.msgCode = "errorDocumentsSave";
                        response.isSuccess = false;
                        return response;
                    });
            }
        });
    }

    /**
     * Update user profile
     * @param {*} employeeDetailsId : logged in employee details id
     * @param {*} reqData : data sent in request body
     */
    updateUserProfile(employeeDetailsId, reqData) {

        let folderName = "/profile",
            timestamp = new Date().getTime(),
            filePath = "",
            response = {};
        /**
         * save profile pic
         */
        if (reqData.profilePicture) {
            let fileName = reqData.firstName + ".png";
            let extension = (path.extname(fileName)).toLowerCase().trim();
            let fileNameWithoutExtension = (fileName.slice(0, -(extension.length))).replace(/[^a-z0-9$\-_.+!*"(),]/gi, "");;

            filePath = folderName + "/" + fileNameWithoutExtension + "_" + timestamp + extension;

            let fileUpload = commonMethods.fileUpload(reqData.profilePicture, fileName, filePath, folderName, null, employeeDetailsId);
            if (fileUpload.isSuccess) {
                reqData.profilePicture = fileUpload.filePath;
            } else {
                response.isSuccess = fileUpload.isSuccess;
                response.msgCode = fileUpload.msgCode;
            }
        }

        /**
         * get employeeDetails and resume_master details and EmployeeContactDetails by id
         */
        return this.getEmployeeDetailsByEmployeeDetailsId(employeeDetailsId)
            .then((empDet) => {
                if (empDet) {
                    reqData.employeeId = (reqData.employeeId) ? reqData.employeeId : (reqData.employeeId == "") ? reqData.employeeId = "" : empDet.employeeId;
                    reqData.firstName = (reqData.firstName) ? reqData.firstName : (reqData.firstName == "") ? reqData.firstName = "" : empDet.firstName;
                    reqData.lastName = (reqData.lastName) ? reqData.lastName : (reqData.lastName == "") ? reqData.lastName = "" : empDet.lastName;
                    reqData.dob = (reqData.dob) ? reqData.dob : (reqData.dob == "") ? reqData.dob = "" : empDet.dob;
                    reqData.profilePicture = (filePath) ? filePath : empDet.profilePicture;
                    reqData.currentJobTitle = (reqData.currentJobTitle) ? reqData.currentJobTitle : (reqData.currentJobTitle == "") ? reqData.currentJobTitle = "" : empDet.currentJobTitle;
                    reqData.authorisationStatusId = (reqData.authorisationStatusId) ? reqData.authorisationStatusId : (reqData.authorisationStatusId == "") ? reqData.authorisationStatusId = "" : empDet.legalFilingStatus;

                    /**
                     * get resume master details
                     */
                    return this.getResumeMasterByEmployeeDetailsId(employeeDetailsId)
                        .then((resumeMaster) => {
                            if (resumeMaster) {
                                reqData.totalExp = (reqData.totalExp) ? reqData.totalExp : (reqData.totalExp == "") ? reqData.totalExp = "" : resumeMaster.totalExp;
                                reqData.totalUsExp = (reqData.totalUsExp) ? reqData.totalUsExp : (reqData.totalUsExp == "") ? reqData.totalUsExp = "" : resumeMaster.totalUsExp;
                                reqData.linkedIn = (reqData.linkedIn) ? reqData.linkedIn : (reqData.linkedIn == "") ? reqData.linkedIn = "" : resumeMaster.linkedIn;
                                reqData.facebook = (reqData.facebook) ? reqData.facebook : (reqData.facebook == "") ? reqData.facebook = "" : resumeMaster.facebook;
                                reqData.twitter = (reqData.twitter) ? reqData.twitter : (reqData.twitter == "") ? reqData.twitter = "" : resumeMaster.twitter;
                                reqData.googlePlus = (reqData.googlePlus) ? reqData.googlePlus : (reqData.googlePlus == "") ? reqData.googlePlus = "" : resumeMaster.googlePlus;
                                reqData.careerProfile = (reqData.careerProfile) ? reqData.careerProfile : (reqData.careerProfile == "") ? reqData.careerProfile = "" : resumeMaster.comments;
                                reqData.jobSearchStatusId = (reqData.jobSearchStatusId) ? reqData.jobSearchStatusId : (reqData.jobSearchStatusId == "") ? reqData.jobSearchStatusId = "" : resumeMaster.jobSearchStatus;

                                /**
                                 * get EmployeeContactDetails
                                 */
                                return this.getEmployeeContactDetailsByEmployeeDetailsId(employeeDetailsId)
                                    .then((empContactDetails) => {
                                        if (empContactDetails) {
                                            reqData.contactNumber = (reqData.contactNumber) ? reqData.contactNumber : (reqData.contactNumber == "") ? reqData.contactNumber = "" : empContactDetails.phoneCell;
                                            reqData.countryId = (reqData.countryId) ? reqData.countryId : (reqData.countryId == "") ? reqData.countryId = "" : empContactDetails.country;
                                            reqData.stateId = (reqData.stateId) ? reqData.stateId : (reqData.stateId == "") ? reqData.stateId = "" : empContactDetails.state;
                                            reqData.cityId = (reqData.cityId) ? reqData.cityId : (reqData.cityId == "") ? reqData.cityId = "" : empContactDetails.cityId;
                                            reqData.address = (reqData.address) ? reqData.address : (reqData.address == "") ? reqData.address = "" : empContactDetails.address;
                                            reqData.zipCode = (reqData.zipCode) ? reqData.zipCode : (reqData.zipCode == "") ? reqData.zipCode = "" : empContactDetails.zipCode;

                                        } else {
                                            reqData.contactNumber = "";
                                            reqData.countryId = "";
                                            reqData.stateId = "";
                                            reqData.cityId = "";
                                            reqData.address = "";
                                            reqData.zipCode = "";
                                        }

                                        reqData.otherCity = (reqData.otherCity) ? reqData.otherCity : "";
                                        reqData.isSme = (reqData.isSme) ? reqData.isSme : "";
                                        reqData.isCounsellor = (reqData.isCounsellor) ? reqData.isCounsellor : "";

                                        let dob = "", newDob = "";

                                        if (reqData.dob) {
                                            dob = new Date(reqData.dob);
                                            newDob = dob.getFullYear() + "-" + (dob.getMonth() + 1) + "-" + dob.getDate();
                                        }

                                        let query = "EXEC API_SP_UpdateUserProfile @EmployeeDetails_Id=\'" + employeeDetailsId + "\'"
                                            + ",@PJEmployee_Id=\'" + reqData.employeeId + "\'"
                                            + ",@First_Name=\'" + reqData.firstName + "\'"
                                            + ",@Last_Name=\'" + reqData.lastName + "\'"
                                            + ",@DOB=\'" + newDob + "\'"
                                            //+ ",@Email_Id=\'" + Email_Id + "\'"
                                            + ",@ProfilePicture=\'" + reqData.profilePicture + "\'"
                                            //+ "@emp_type=\'" + emp_type + "\'"
                                            + ",@CurrentJobTitle=\'" + reqData.currentJobTitle + "\'"
                                            + ",@AuthorisationStatusId=\'" + reqData.authorisationStatusId + "\'"
                                            + ",@Total_Exp=\'" + reqData.totalExp + "\'"
                                            + ",@TotalUSExp=\'" + reqData.totalUsExp + "\'"
                                            + ",@LinkedIn=\'" + reqData.linkedIn + "\'"
                                            + ",@Facebook=\'" + reqData.facebook + "\'"
                                            + ",@Twitter=\'" + reqData.twitter + "\'"
                                            + ",@GooglePlus=\'" + reqData.googlePlus + "\'"
                                            + ",@CareerProfile=\'" + reqData.careerProfile + "\'"
                                            + ",@Phone_Cell=\'" + reqData.contactNumber + "\'"
                                            + ",@Country=\'" + reqData.countryId + "\'"
                                            + ",@State=\'" + reqData.stateId + "\'"
                                            + ",@City_Id=\'" + reqData.cityId + "\'"
                                            + ",@Address=\'" + reqData.address + "\'"
                                            + ",@Zip_Code=\'" + reqData.zipCode + "\'"
                                            + ",@OtherCity=\'" + reqData.otherCity + "\'"
                                            + ",@JobSearchStatusId=\'" + reqData.jobSearchStatusId + "\'";

                                        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                                            .then((Resume_Id) => {

                                                let promises = [];

                                                /**
                                                 *  CUD operation in skilldetails
                                                 */
                                                if (reqData.skillsList && reqData.skillsList.length) {
                                                    promises.push(this.manageSkillDetails(employeeDetailsId, reqData.skillsList));
                                                }

                                                /**
                                                 *  CUD operation in licensesList
                                                 */
                                                if (reqData.licensesList && reqData.licensesList.length) {
                                                    promises.push(this.manageLicensesDetails(employeeDetailsId, reqData.licensesList));
                                                }

                                                /**
                                                 *  CUD operation in certifications
                                                 */
                                                if (reqData.certificationsList && reqData.certificationsList.length) {
                                                    promises.push(this.manageCertificationDetails(employeeDetailsId, reqData.certificationsList));
                                                }

                                                /**
                                                 *  CUD operation in educationsList
                                                 */
                                                if (reqData.educationsList && reqData.educationsList.length) {
                                                    promises.push(this.manageEducationListDetails(employeeDetailsId, reqData.educationsList));
                                                }

                                                /**
                                                 * CUD operation in documentsList
                                                 */
                                                if (reqData.documentsList && reqData.documentsList.length) {
                                                    let newList = [];
                                                    /**
                                                     * Save file in folder
                                                     */
                                                    for (let i = 0; i < reqData.documentsList.length; i++) {
                                                        let fileName = "";
                                                        if (reqData.documentsList[i].action.toLowerCase() != "d") {
                                                            let file = reqData.documentsList[i].file;
                                                            fileName = reqData.documentsList[i].fileName;

                                                            let extension = (path.extname(fileName)).toLowerCase().trim();
                                                            let fileNameWithoutExtension = (fileName.slice(0, -(extension.length))).replace(/[^a-z0-9$\-_.+!*"(),]/gi, "");;
                                                            filePath = folderName + "/" + fileNameWithoutExtension + "_" + timestamp + extension;

                                                            let fileUpload = commonMethods.fileUpload(file, fileName, filePath, folderName,null, employeeDetailsId);

                                                            if (!fileUpload.isSuccess) {
                                                                response.isSuccess = fileUpload.isSuccess;
                                                                response.msgCode = fileUpload.msgCode;
                                                            }
                                                        }

                                                        /**
                                                         * convert list to objects
                                                         */
                                                        newList.push({
                                                            candidateDocId: reqData.documentsList[i].candidateDocId,
                                                            Resume_Id: Resume_Id[0].Resume_Id,
                                                            Resume_File: filePath,
                                                            File_name: fileName,
                                                            Created_By: employeeDetailsId,
                                                            Created_Date: new Date(),
                                                            Modified_By: employeeDetailsId,
                                                            Modified_Date: new Date(),
                                                            action: reqData.documentsList[i].action
                                                        });
                                                        promises.push(this.manageDocumentsListDetails(employeeDetailsId, newList));
                                                    }
                                                }
                                                return Q.all(promises)
                                                    .then((allResponses) => {
                                                        response.isSuccess = true;
                                                        return response;
                                                    })
                                                    .catch((error) => {
                                                        logger.error("Error has occured in profile-management-model/ Q process catch.", error);
                                                        response.msgCode = "userProfileUpdateFailed";
                                                        response.isSuccess = false;
                                                        return response;
                                                    });
                                            })
                                    })
                            }
                        })
                }
            })
    }

    /**
         * reset email id
         * @param {*} newEmailId : new email id
         * @param {*} employeeDetailsId : logged in employee details id
         */
    resetEmailId(reqData, employeeDetailsId) {
        let response = {};
        let query = "EXEC API_SP_ResetEmailId @Email_Id=\'" + reqData.newEmailId + "\', @EmployeeDetails_Id=\'" + employeeDetailsId + "\' ";
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

    /**
     *
     * @param {*} employeeEducationId : logged in employee details id
     */
    getUsersByEduId(employeeEducationId, userId) {
        return EmployeeEducationDetails.findOne({
            where: {
                EmployeeEducation_Id: employeeEducationId,
                EmployeeDetails_Id: userId
            },
        })
            .then((userDetails) => {
                return userDetails;
            });
    }

    /**
*
* @param {*} employeeEducationId : logged in employee details id
*/
    getUsersByDocId(candidateDocId, resumeId) {
        return Candidate_ResumeAndDoc.findOne({
            where: {
                CandidateDoc_Id: candidateDocId,
                resumeId: resumeId
            },
        })
            .then((userDetails) => {
                return userDetails;
            });
    }

    /**
 *
 * @param {*} employeeEducationId : logged in employee details id
 */
    getUsersByLicId(employeeLicenseId) {
        return EmployeeLicense.findOne({
            where: {
                EmployeeLicense_Id: employeeLicenseId
            },
        })
            .then((userDetails) => {
                return userDetails;
            });
    }

    /**
 *
 * @param {*} employeeEducationId : logged in employee details id
 */
    getUsersByCertId(empCertificationDetailsId) {
        return EmployeeCertificationDetails.findOne({
            where: {
                EmpCertificationDetails_Id: empCertificationDetailsId
            },
        })
            .then((userDetails) => {
                return userDetails;
            });
    }

    /**
 *
 * @param {*} employeeEducationId : logged in employee details id
 */
    getUsersByAchiveId(candidateAchievementsId, resumeId) {
        return CandidateAchievement.findOne({
            where: {
                CandidateAchievement_Id: candidateAchievementsId,
                resumeId: resumeId
            },
        })
            .then((userDetails) => {
                return userDetails;
            });
    }

    /**
* Delete Immigration Documents
* @param {*} reqData : data sent in request body
*/
    deleteUsersByDocID(reqData) {
        let query = "DELETE from Candidate_ResumeAndDoc where CandidateDoc_Id=\'" + reqData.candidateDocId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }

    /**
* Delete Immigration Documents
* @param {*} reqData : data sent in request body
*/
    deleteUsersByLicId(reqData) {
        let query = "DELETE from EmployeeLicense where EmployeeLicense_Id =\'" + reqData.employeeLicenseId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }

    /**
* Delete Immigration Documents
* @param {*} reqData : data sent in request body
*/
    deleteUsersByCertId(reqData) {
        let query = "DELETE from EmployeeCertificationDetails where EmpCertificationDetails_Id=\'" + reqData.empCertificationDetailsId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }



    /**
* Delete Immigration Documents
* @param {*} reqData : data sent in request body
*/
    deleteUsersByAchiveId(reqData) {
        let query = "DELETE from CandidateAchievement where CandidateAchievement_Id=\'" + reqData.candidateAchievementsId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }


    /**
    * upload user Profile Pic
    * @param {*} employeeDetailsId : logged in employee details id
    * @param {*} profilePicture : profile Picture base 64 string
    */
    uploadProfilePic(employeeDetailsId, profilePicture) {
        return new Promise(function (resolve, reject) {

            let response = {},
                msgCode = [];

            let ext = commonMethods.getIncomingFileExtension(profilePicture);
            let profileVars = enums.uploadType.userPicture;

            if (profileVars.allowedExt.indexOf(ext) < 0) {
                response.isSuccess = false;
                response.msgCode = ['image']
                resolve(response);
            }
            else {

                let fileName = employeeDetailsId + '.' + ext;

                commonMethods.fileUpload(profilePicture, fileName, profileVars.docTypeId, null, null, employeeDetailsId)
                    .then((fileUpload) => {
                        response.isSuccess = fileUpload.isSuccess;

                        if (fileUpload.isSuccess) {
                            response.profilePicture = fileUpload.fileName;
                        } else {
                            response.msgCode = fileUpload.msgCode;
                        }
                        resolve(response);
                    })
                    .catch((error) => {
                        logger.error("Error has occured in profile-management-model/uploadProfilePic.", error);
                        response.isSuccess = false;
                        resolve(response);
                    })
            }
        })

    }


    /*
    *   
    *save resume and document in Candidate_ResumeAndDoc table
    */
    updateCandidateResume(resumeObj) {
        resumeObj.modifiedBy = resumeObj.employeeDetailsId;
        resumeObj.modifiedDate = new Date();

        return crudOperationModel.findAllByCondition(Candidate_ResumeAndDoc, { resumeId: resumeObj.resumeId }, ['resumeId'])
            .then(result => {
                if (!result.length) {
                    return crudOperationModel.saveModel(Candidate_ResumeAndDoc, resumeObj, { candidateDocId: 0 })
                        .then(rs1 => {
                            return rs1;
                        })
                }
                else {
                    if (resumeObj.docType == enums.uploadType.docTypes.resume) {
                        return crudOperationModel.updateAll(Candidate_ResumeAndDoc, { isPrimary: 0 }, { resumeId: resumeObj.resumeId })
                            .then(rs => {
                                return crudOperationModel.saveModel(Candidate_ResumeAndDoc, resumeObj, { candidateDocId: 0 })
                                    .then(rs1 => {
                                        return rs1;
                                    })
                            })
                    }
                    else {
                        let where = {};
                        if (resumeObj.docType == enums.uploadType.docTypes.w9) {
                            where['resumeId'] = resumeObj.resumeId;
                            where['docType'] = enums.uploadType.docTypes.w9
                        }
                        else {
                            where['candidateDocId'] = 0;
                        }

                        // return crudOperationModel.updateAll(Candidate_ResumeAndDoc, { isPrimary: 0 }, { resumeId: resumeObj.resumeId })
                        // .then(rs => {
                        return crudOperationModel.saveModel(Candidate_ResumeAndDoc, resumeObj, where)
                            .then(rs1 => {
                                return rs1;
                            })
                        // })
                    }
                }
            })


    }



    /**
 * resumeSearch method for search resume 
 * @param {*} reqBody 
 */

    resumeSearch(reqBody) {
        let self = this;
        let response = {}, assignmentType = [], obj = reqBody.empDetails ? reqBody.empDetails : {};
        reqBody.skills = "";
        return new Promise(function (resolve, reject) {
            //set resume file

            if (reqBody.documents) {
                if (reqBody.documents.fileType == enums.doc.type.resume) {
                    obj.filename = reqBody.documents.fileName;
                    obj.base64 = reqBody.documents.file;
                }
            }

            async.series([
                //get user details
                function (done) {
                    self.getUserProfileById(reqBody.employeeDetailsId)
                        .then((data) => {
                            if (data) {
                                obj.email = data.emailId;
                                obj.firstName = data.firstName;
                                obj.vertical = data.industryVertical;
                                obj.workStatus = data.authorisationStatus;
                                obj.cityName = data.city;
                                obj.stateName = data.state;
                                obj.stateCode = data.stateCode;
                                obj.experience = data.totalExp;
                                obj.countryCode = data.countryCode ? data.countryCode : "US";
                                obj.assignmentType = data.desiredEmployement;
                                obj.prefLocation = data.prefferedCity;
                            }
                            done();
                        })
                        .catch((err) => {
                            done();
                        })
                },

                //get skills
                function (done) {
                    skillDetailsModel.getSkillsByEmployeeDetailsId(reqBody.employeeDetailsId)
                        .then((data) => {
                            let skills = '';
                            if (data.length) {
                                data.forEach(function (item) {
                                    skills += ', ' + item.skillName
                                });
                            }
                            obj.skills = skills ? skills.substr(1) : '';
                            done();
                        })
                        .catch(err => {
                            done();
                        })
                },
                //call third party url
                function (done) {
                    let body = {
                        "email": obj.email,//"deshawnv150@gmail.com",
                        "status": "Active",
                        "firstName": obj.firstName,
                        "lastName": obj.lastName ? obj.lastName : '',
                        "phone": obj.contactNumber ? obj.contactNumber : '',
                        "workStatus": obj.workStatus ? obj.workStatus : '',
                        "assignmentType": obj.assignmentType ? obj.assignmentType : '',
                        "prefLocation": obj.prefLocation ? obj.prefLocation : '',
                        "skills": obj.skills ? obj.skills : '',
                        "annualRate": obj.annualSalary ? obj.annualSalary : '',
                        "hourlyRate": (obj.contractRate && obj.contractRateTypeId == 1101) ? obj.contractRate : '', //Hourly rate  1101
                        "availability": obj.availabilityId ? obj.availabilityId : '',
                        "experience": obj.totalExp ? obj.totalExp : '',
                        "vertical": obj.vertical ? obj.vertical : '',
                        "category": "",
                        "designation": "",
                        "technology": "",
                        "stateCode": obj.stateCode ? obj.stateCode : '',
                        "stateName": obj.stateName ? obj.stateName : '',
                        "city": obj.cityName ? obj.cityName : '',
                        "countryCode": obj.countryCode,
                        "hotListed": "",
                        "resumeFile": {
                            "filename": obj.filename ? obj.filename : '',
                            "base64": obj.base64 ? obj.base64 : ''
                        }
                    };

                    Object.keys(body).forEach(item => {
                        if (body[item] == '') {
                            delete body[item];
                        }
                        if (item == 'resumeFile') {
                            if (!body[item].filename && !body[item].base64) {
                                delete body['resumeFile'];
                            }
                        }
                    })
                    var options = {
                        method: 'POST',
                        url: config.thirdPartyResumeSearchApiUrl,
                        headers:
                        {
                            'secretKey': config.thirdPartyResumeSearchApiUrlToken,
                            'Content-Type': 'application/json'
                        },
                        body: body,
                        json: true,
                        timeout: 30000
                    };
                    request(options, function (error, resp, body) {


                        if (error || body.status == 500 || body.status == 404 || body.status == 417) {
                            response.isSuccess = false;
                            response.msgCode = [];
                            if (body && body.content) {
                                for (key in body.content) {
                                    if (key == email)
                                        response.msgCode.push("email");
                                    if (key == firstName)
                                        response.msgCode.push("firstName");
                                    if (key == countryCode)
                                        response.msgCode.push("countryCode");
                                    if (key == status)
                                        response.msgCode.push("status");
                                }
                            }
                            logger.error('Error has occured in common-methods/resumeSearch .', error);
                            done(error);
                        } else {
                            response.isSuccess = true;
                            done();
                        }

                    });
                }
            ]
                ,
                function (err) {
                    if (err) {
                        response.isSuccess = false;
                        response.msgCode = [];
                        return resolve(response);
                    }
                    return resolve(response);
                })
        });
    }


    getStateCountryByCity(cityId) {
        let query = "EXEC API_SP_GetStateCountryByCityId @cityId=\'" + cityId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }

    getSourceEntity(source, entity) {
        return new Promise(resolve => {

            crudOperationModel.findAllByCondition(APP_REF_DATA, { keyId: source }, [['keyId', 'id'], ['keyName', 'name']])
                .then(rs => {
                    crudOperationModel.findAllByCondition(APP_REF_DATA, { keyId: entity }, [['keyId', 'id'], ['keyName', 'name']])
                        .then(rs1 => {
                            if (rs.length && rs1.length) {
                                return resolve({ source: rs[0].name, entity: rs1[0].name });
                            }
                            else {
                                return resolve({ source: '', entity: '' });
                            }
                        })
                })
        })
    }

    updatePreferredCity(employeeDetailsId, cityState) {
        return new Promise(resolve => {

            let query = " UPDATE Resume_Master set PrefferedCity = '" + cityState + "' " +
                " WHERE FromEmployeeDetails_Id = " + employeeDetailsId +
                " AND (PrefferedCity = '' OR PrefferedCity is null )";

            return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
                .then((details) => {
                    return resolve(true);
                })


            /*
            // commented because updated_by has to be converted into integer instead of varchar till than direct query will work
            ResumeMaster.update({prefferedCity:cityState}, { where : 
                {
                    employeeDetailsId : employeeDetailsId,                     
                    $or : [
                        {
                            prefferedCity : ''
                        },
                        {
                            prefferedCity : null
                        },
                    ]
                } 
            })
            .then( rs1 => {
                // console.log(rs1)
            })
            
            resolve(true)
            */

        })
    }

    getOtherInformationByDomainId(domainId){
        let type = 'role';
        //let query = "EXEC API_SP_GetOtherInformationByDomain @domainId=\'" + domainId + "\'" + ",@type=\'" + type + "\'"
        let query = "EXEC MVC_GetDomainBasedAttributes @domainId=\'" + domainId + "\'" + ",@type=\'" + type + "\'"
        
        console.log('------getOtherInformationByDomainId 1----')
        console.log(query)

        let emp =[];
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                emp['roles'] = details;
                return emp;
            })
            .then(emp => {
                let type = 'primaryskill';
                //let query1 = "EXEC API_SP_GetOtherInformationByDomain @domainId=\'" + domainId + "\'" + ",@type=\'" + type + "\'"
                let query1 = "EXEC MVC_GetDomainBasedAttributes @domainId=\'" + domainId + "\'" + ",@type=\'" + type + "\'"
                console.log('------getOtherInformationByDomainId 2----')
                console.log(query1)

                return dbContext.query(query1, { type: dbContext.QueryTypes.SELECT })
                    .then((details1) => {
                       emp['primarySkills'] = details1;
                        return emp;
                    })
            });
    }


    geFunctionalAreaDepartmentAndIndustry(type){
        //let department = 'department';
        //let query = "EXEC API_SP_GetOtherInformationByDomain @type = " + department + " ";
        let query = "EXEC MVC_GetDomainBasedAttributes @type = \'" + type + "\'";
        console.log('------geFunctionalAreaDepartment----')
        console.log(query)
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }

}