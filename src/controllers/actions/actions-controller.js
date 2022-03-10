/**
 *  -------Import all classes and packages -------------
 */
import actionModel from '../../models/actions/actions-model';
// call models
import UserModel from '../../models/profileManagement/profile-management-model-v5';
import CrudOperationModel from '../../models/common/crud-operation-model';
import TimecardsModel from '../../models/timecards/timecards-model';
import RegionsModel from '../../models/regions/regions-model';

// call all entities 
import {ResumeEducationDataType,EmployeeCertificationDetails, CandidateAchievement, EmployeeDetails, ResumeMaster, CandidateSkills    
} from "../../entities/index";
import { AppRefDataChild } from '../../entities/common/app-ref-data-child';
import responseFormat from '../../core/response-format';
import configContainer from '../../config/localhost';
import enums from '../../core/enums';
import CommonMethods from '../../core/common-methods';
import lodash from 'lodash';
import async from 'async';
import fieldsLength from '../../core/fieldsLength';
import AccountValidation from '../../validations/accounts/accounts-validation';

/**
 *  -------Initialize global variabls-------------
 */
let userModel = new UserModel(),
    config = configContainer.loadConfig(),
    crudOperationModel = new CrudOperationModel(),
    commonMethods = new CommonMethods(),
    regionsModel = new RegionsModel(),
    accountValidation = new AccountValidation();

class ActionController {


    /**
     * Get employee details after sign in
     * @param {*} req : HTTP request argument
     * @param {*} res : HTTP response argument
     * @param {*} next : Callback argument
     */
    verifyPaswword(req, res, next) {
        let response = responseFormat.createResponseTemplate(),
            employeeDetailsId = req.body.employeeId,
            password = req.body.password ? req.body.password.replace(/'/g, "''") : '',
            msgCode = [];
        msgCode = accountValidation.paswwordValidation(req.body);
        if (msgCode.length) {
            response = responseFormat.getResponseMessageByCodes(msgCode, { code: 417 });
            res.status(200).json(response);
        } else {
            actionModel.getUserById(employeeDetailsId)
            .then((isUser) => {
               if (isUser) {
                    //let empDetails = {};
                    if ( isUser.password == req.body.password){

                        let condition = { employeeDetailsId: employeeDetailsId };

                        if (req.body.type == 'bs'){
                            let empDetails = { 
                                careerProfile: req.body.data,
                                modifiedDate: new Date().toDateString(),
                                modifiedBy: employeeDetailsId,
                                employeeDetailsId: employeeDetailsId 
                            }
                            crudOperationModel.saveModel(ResumeMaster, empDetails, condition)
                            .then(rs => {
                                response = responseFormat.getResponseMessageByCodes(['Update:Successfully']);
                                res.status(200).json(response)
                            }).catch((error) => {
                                let resp = commonMethods.catchError('actions-controller/verifyPaswword EmployeeDetails process.', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            })                            
                        }else if (req.body.type == 'skills') {
                            var dataArray = req.body.data.split('|');
                            var primaryArray = req.body.isPrimary.split('|');
                            var experienceArray = req.body.experience.split('|');
                            var k = 1;
                            for (var i = 0; i < dataArray.length; i++) {
                               var primary = (primaryArray[i] == 'y') ? true :false;
                                let skills = { 
                                    candidateSkillId: '',
                                    skillName: dataArray[i],
                                    yearExp: experienceArray[i],
                                    isPrimary: primary
                                }
                                this.manageSkills(employeeDetailsId, skills, function (response) {
                                    if (response.statusCode == 200 ) {
                                        if (k == dataArray.length) {
                                            res.status(response.statusCode).json(response.responseFormat);
                                        }                                        
                                    }else{
                                        res.status(response.statusCode).json(response.responseFormat);
                                    }
                                    k++;
                                })
                            }
                        }else if (req.body.type == 'certificates') {
                            var dataArray = req.body.data.split('|');
                            var validity  = '';
                            if (req.body.validity == null){
                                validity = null;
                            }else{
                                var validityArray = req.body.validity.split('|');
                            }
                            
                            var k = 1;
                            for (var i = 0; i < dataArray.length; i++) {
                                if (req.body.validity != null){
                                    var validity = (validityArray[i] != '') ? validityArray[i] :null;
                                }
                                
                                let licensesAndCertifications = { 
                                    empCertificationDetailsId: '',
                                    certificateExamName: dataArray[i],
                                    expiryRenewalDate: validity
                                }
                                this.manageCertifications(employeeDetailsId, licensesAndCertifications, function (response) {
                                    if (response.statusCode == 200 ) {
                                        if (k == dataArray.length) {
                                            res.status(response.statusCode).json(response.responseFormat);
                                        }                                        
                                    }else{
                                        res.status(response.statusCode).json(response.responseFormat);
                                    }
                                    k++;
                                })
                            }
                        }else if (req.body.type == 'achievements') {
                            var dataArray = req.body.data.split('|');
                            var k = 1;
                            for (var i = 0; i < dataArray.length; i++) {
                                let candidateAchievements = { 
                                    candidateAchievementId: '',
                                    description: dataArray[i]
                                }
                                this.manageCandidateAchievements(employeeDetailsId, candidateAchievements, function (response) {
                                    if (response.statusCode == 200 ) {
                                        if (k == dataArray.length) {
                                            res.status(response.statusCode).json(response.responseFormat);
                                        }                                        
                                    }else{
                                        res.status(response.statusCode).json(response.responseFormat);
                                    }
                                    k++;
                                })
                            }
                        }else if (req.body.type == 'expertise') {
                            var dataArray = req.body.data.split('|');
                            let respData = {};
                            userModel.getProfileLookupData()
                            .then((responseList) => {
                                respData =  this.filterLookupCollection(responseList, "IV");
                                var k = 1;
                                for (var i = 0; i < dataArray.length; i++) {
                                    var response = respData.filter(function (item) { return item.keyName == dataArray[i] });
                                    if ( response.length > 0 ){
                                        let empDetails = { 
                                            industryVerticalId: response[0].keyId
                                        }
                                        crudOperationModel.saveModel(ResumeMaster, empDetails, condition)
                                        .then(rs => {
                                            if (res.statusCode == 200 ) {
                                                if (k == dataArray.length) {
                                                    response = responseFormat.getResponseMessageByCodes(['Update:Successfully']);
                                                    res.status(200).json(response)
                                                }
                                                k++;
                                            }
                                        }).catch((error) => {
                                            let resp = commonMethods.catchError('actions-controller/verifyPaswword EmployeeDetails process.', error);
                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                            res.status(resp.code).json(response);
                                        })
                                    }else{                               
                                        response = responseFormat.getResponseMessageByCodes(['expertise:This expertise is not exist'], { code: 417 });
                                        res.status(200).json(response)
                                    }
                                }
                            })
                            .catch((error) => {
                                let resp = commonMethods.catchError('actions-controller/verifyPaswword process.', error);
                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                res.status(resp.code).json(response);
                            });
                        }else if (req.body.type == 'domain') {
                            let respData = {};
                            userModel.getProfileLookupData()
                            .then((responseList) => {
                                respData =  this.filterLookupCollection(responseList, "DMN");;
                                var response = respData.filter(function (item) { return item.keyName == req.body.data});
                                if ( response.length > 0 ){
                                    let domainId = response[0].keyId;
                                    crudOperationModel.findAllByCondition(AppRefDataChild, { AppRefData_KeyId: domainId },
                                        ['keyId', 'appRefParentId', 'keyName'], ['keyName', 'ASC'])
                                        .then(resp => {
                                            var result = resp.filter(function (item) { return item.keyName == req.body.subDomain });
                                            if ( result.length > 0 ){
                                                let subdomainId = result[0].keyId;
                                                let empDetails = { 
                                                    domainId: domainId,
                                                    subDomainId: subdomainId
                                                }                                                
                                                crudOperationModel.saveModel(ResumeMaster, empDetails, condition)
                                                .then(rs => {
                                                    if (res.statusCode == 200 ) {
                                                        response = responseFormat.getResponseMessageByCodes(['Update:Successfully']);
                                                        res.status(200).json(response)
                                                    }
                                                }).catch((error) => {
                                                    let resp = commonMethods.catchError('actions-controller/verifyPaswword EmployeeDetails process.', error);
                                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                    res.status(resp.code).json(response);
                                                })                                                
                                            }else{                             
                                                response = responseFormat.getResponseMessageByCodes(['sudomain:This subDomain is not exist'], { code: 417 });
                                                res.status(200).json(response)
                                            }

                                        }).catch(err => {
                                            let resp = commonMethods.catchError('actions-controller/verifyPaswword', err);
                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                            res.status(resp.code).json(response);
                                        });
                                }else{                                   
                                    response = responseFormat.getResponseMessageByCodes(['domain:This domain is not exist'], { code: 417 });
                                    res.status(200).json(response)
                                }

                            });
                        }else if (req.body.type == 'location') {
                            regionsModel.getAllCountry()
                                .then((country) => {
                                    var countryResult = country.filter(function (item) { return item.countryName == req.body.country });

                                     if ( countryResult.length > 0 ){
                                        let countryId = countryResult[0].countryId;
                                        regionsModel.getAllStateByCountryId(countryId)
                                            .then((state) => {
                                                var stateResult = state.filter(function (item) { return item.stateName == req.body.state });

                                                if ( stateResult.length > 0 ){
                                                    let stateId = stateResult[0].stateId;
                                                    let stateInfo = stateResult[0].dataValues.state;
                                                        regionsModel.getAllCityByStateId(stateId)
                                                        .then((city) => {
                                                            var cityResult = city.filter(function (item) { return item.cityName == req.body.city });
                                                            if ( cityResult.length > 0 ){
                                                                let cityId = cityResult[0].cityId;
                                                                let empDetails = {
                                                                    currentLocation: req.body.data, 
                                                                    countryId: countryId, 
                                                                    stateId: stateInfo, 
                                                                    cityId: cityId,
                                                                    zipCode:req.body.zipCode
                                                                }
                                                                //console.log(empDetails)
                                                                crudOperationModel.saveModel(ResumeMaster, empDetails, condition)
                                                                .then(rs => {
                                                                    if (res.statusCode == 200 ) {
                                                                        response = responseFormat.getResponseMessageByCodes(['Update:Successfully']);
                                                                        res.status(200).json(response)
                                                                    }
                                                                }).catch((error) => {
                                                                    let resp = commonMethods.catchError('actions-controller/verifyPaswword EmployeeDetails process.', error);
                                                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                                                                    res.status(resp.code).json(response);
                                                                })

                                                            }else{                                   
                                                                response = responseFormat.getResponseMessageByCodes(['regions:This city is not exist'], { code: 417 });
                                                                res.status(200).json(response)
                                                            }
                                                        })
                                                        .catch((error) => {
                                                            let resp = commonMethods.catchError('actions-controller/verifyPaswword', error);
                                                            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });                
                                                            res.status(resp.code).json(response);
                                                        })

                                                }else{                                   
                                                    response = responseFormat.getResponseMessageByCodes(['regions:This state is not exist'], { code: 417 });
                                                    res.status(200).json(response)
                                                }
                                            })
                                            .catch((error) => {
                                                let resp = commonMethods.catchError('actions-controller/verifyPaswword', error);
                                                response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });                
                                                res.status(resp.code).json(response);
                                            })

                                    }else{                                   
                                        response = responseFormat.getResponseMessageByCodes(['regions:This country is not exist'], { code: 417 });
                                        res.status(200).json(response)
                                    }
                                })
                                .catch((error) => {
                                    let resp = commonMethods.catchError('actions-controller/verifyPaswword', error);
                                    response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });                
                                    res.status(resp.code).json(response);
                                })                            
                        }else if (req.body.type == 'education') {
                            var dataArray = req.body.data.split('|');
                            var institutionArray = req.body.institution.split('|');
                            var passingYearArray = req.body.passingYear.split('|');
                            var k = 1;
                            for (var i = 0; i < dataArray.length; i++) {
                                var institution = (institutionArray[i] != '') ? institutionArray[i] :null;
                                var passingYear = (passingYearArray[i] != '') ? passingYearArray[i] :null;
                                let educations = { 
                                    employeeEducationId: '',
                                    qualification: dataArray[i],
                                    institutionName: institution,
                                    passingYear: passingYear
                                }
                                this.manageEducations(employeeDetailsId, educations, function (response) {
                                    if (response.statusCode == 200 ) {
                                        if (k == dataArray.length) {
                                            res.status(response.statusCode).json(response.responseFormat);
                                        }
                                    }else{
                                        res.status(response.statusCode).json(response.responseFormat);
                                    }
                                    k++;
                                })
                            }
                        }                       
                    }else{
                        response = responseFormat.getResponseMessageByCodes(['Signin:invalidPassword'], { code: 417 });
                        res.status(200).json(response)
                    }
                }
                else {
                    response = responseFormat.getResponseMessageByCodes(['userId:userNotExists'], { code: 417 });
                    res.status(200).json(response)
                }
            })          
        }
    }
  
     /**
     * Common methods for Verify User Id
     * @param {*} employeeId : employeeDetailsId
     */
    verifyUserId(req, res, next) {
        let response = responseFormat.createResponseTemplate(),
            employeeDetailsId = req.body.employeeId;

        actionModel.getUserById(employeeDetailsId)
        .then((isUsers) => {
            if (isUsers) {
                //let data = { Email_Id: users[0].Email_Id };
                if (config.allowedCompanyId.indexOf(isUsers.CompanyMaster_Id) < 0) {
                    response = responseFormat.getResponseMessageByCodes('', { code: 401, content: { dataList: [{ 'CompanyMasterId': isUsers.CompanyMaster_Id }] } });
                    res.status(200).json(response)
                }else{
                    response = responseFormat.getResponseMessageByCodes(['userId:Exists']);
                    res.status(200).json(response)
                }
            }
            else {
                response = responseFormat.getResponseMessageByCodes(['userId:userNotExists'], { code: 417 });
                res.status(200).json(response)
            }
        })
        .catch((error) => {
            let resp = commonMethods.catchError('actions-controller/VerifyUserId', error);
            response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
            res.status(resp.code).json(response);
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
                            let response = commonMethods.catchError('actions-controller/verifyPaswword manageSkill process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('actions-controller/verifyPaswword manageSkill process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('actions-controller/verifyPaswword manageSkill process.', error);
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
                            let response = commonMethods.catchError('actions-controller/verifyPaswword manageCertifications process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('actions-controller/verifyPaswword manageCertifications process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('actions-controller/verifyPaswword manageCertifications process.', error);
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
                            let response = commonMethods.catchError('actions-controller/verifyPaswword manageExperiences process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                            next(resp);
                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('actions-controller/verifyPaswword manageExperiences process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('actions-controller/verifyPaswword manageExperiences process.', error);
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
                if (educations.passingYear != null){
                    educations.passingYear = new Date(educations.passingYear, 1, 1);
                }else{
                    educations.passingYear = null;
                }
                
                crudOperationModel.saveModel(ResumeEducationDataType, educations, { employeeEducationId: educations.employeeEducationId })
                    .then((result) => {
                        if (result) {
                            // update employee status to active in resume_master
                            self.updateEmployeeStatus(employeeDetailsId, function (rs) { })

                            resp.statusCode = 200;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(['success:saved']);
                        } else {
                            let response = commonMethods.catchError('actions-controller/verifyPaswword manageEducations process.');
                            resp.statusCode = response.code;
                            resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });

                        }
                        next(resp);
                    })
                    .catch((error) => {
                        let response = commonMethods.catchError('actions-controller/verifyPaswword EmployeeEducationDetails process.', error);
                        resp.statusCode = response.code;
                        resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                        next(resp);
                    })
            }
        ], function (error, rs) {
            if (error) {
                let response = commonMethods.catchError('actions-controller/verifyPaswword EmployeeEducationDetails series process.', error);
                resp.statusCode = response.code;
                resp.responseFormat = responseFormat.getResponseMessageByCodes(response.message, { code: response.code });
                next(resp);
            }
            else {
                next(rs);
            }
        })

    }

    updateEmployeeStatus(employeeDetailsId, next) {
        crudOperationModel.saveModel(ResumeMaster, { status: 1 }, { employeeDetailsId: employeeDetailsId })
            .then(up => {
                next(up);
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
            countryDialCode: []
        }];


         userModel.getProfileLookupData()
            .then((responseList) => {
                respData[0].authorizationStatusList = this.filterLookupCollection(responseList, "ASL");
                let allJobSearchStatusList = this.filterLookupCollection(responseList, "JSSL");
                respData[0].licenseTypeList = this.filterLookupCollection(responseList, "LTL");
                respData[0].qualificationList = this.filterLookupCollection(responseList, "DL");
                respData[0].empIndustryVerticalList = this.filterLookupCollection(responseList, "IV");
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
                            'By applying for this job through  I agree to provide  the exclusive Right to Represent me for this job with this company. ' +
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


                let timecardsModel = new TimecardsModel();
                timecardsModel.getAllStatusLookup(enums.appRefParentId.immigrationRateType)
                    .then((rateType) => {
                        respData[0].rateType = rateType;
                        response = responseFormat.getResponseMessageByCodes('', { content: { dataList: respData } });
                        res.status(200).json(response);

                    })
                    .catch((error) => {
                        let resp = commonMethods.catchError('actions-controller/verifyPaswword process.', error);
                        response = responseFormat.getResponseMessageByCodes(resp.message, { code: resp.code });
                        res.status(resp.code).json(response);
                    })

            })
            .catch((error) => {
                let resp = commonMethods.catchError('actions-controller/verifyPaswword process.', error);
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


}


module.exports = ActionController;