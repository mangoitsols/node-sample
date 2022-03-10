/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from "../../core/db";
import logger from "../../core/logger";
import configContainer from "../../config/localhost";
import { CandidateEmploymentExperience } from "../../entities/profileManagement/candidate-employment-experience";
import { EmployeeEducationDetails } from "../../entities/profileManagement/employee-education-details";


/**
 *  -------Initialize global variabls-------------
 */
let config = configContainer.loadConfig();

export default class CandidateEmploymentExperienceModel {

    constructor() {
        //
    }

    /**
     * Get Candidate Experience By ResumeId
     * @param {*} employeeDetailsId : logged in employee details id 
     */

    getCandidateEmploymentExperienceByEmployeeDetailsId(employeeDetailsId) {
        let query = "EXEC API_SP_GetExperienceByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";

        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            }).catch(err => {
                logger.error('Error has occured in profile-management-model/getCandidateEmploymentExperienceByEmployeeDetailsId.', error);
                return null;
            })
    }


    /**
  * Get Experience by candidateEmploymentExperienceId and EmployeeDetails id 
  * @param {*} employeeDetailsId : logged in employee details id
  * @param {*} candidateEmploymentExperienceId : candidateEmploymentExperience Id
  */
    getExperienceByCandidateEmploymentExperienceId(resumeId, candidateEmploymentExperienceId) {
        return CandidateEmploymentExperience.findOne({
            where: {
                CandidateEmploymentExperience_Id: ~~candidateEmploymentExperienceId,
                resumeId: ~~resumeId
            },
            raw: true,
            attributes: [
                ["CandidateEmploymentExperience_Id", "candidateEmploymentExperienceId"],
                // ["Resume_Id", "resumeId"],
                // ["Qualification", "qualificationId"],
                // ["Institution_Name", "institutionName"],
                // ["PassingYear", "passingYear"],
                //["EmployeeDetails_Id", "employeeDetailsId"],
                ["Created_By", "createdBy"],
                ["Created_Date", "createdDate"]
            ]
        })
            .then((education) => {
                education = JSON.parse(JSON.stringify(education).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                return education;
            });
    }

    /** 
    * Add operation in  Candidate Employment Experience
    * @param {*} employeeDetailsId : logged in employee id
    * @param {*} experience : experience object
    */
    addExperience(employeeDetailsId, experiences) {
        let obj = {
            Qualification: experiences.qualificationId,
            Institution_Name: experiences.institutionName,
            PassingYear: experiences.passingYear,
            EmployeeDetails_Id: employeeDetailsId,
            Created_By: employeeDetailsId,
            Created_Date: new Date()
        }
        return new Promise((resolve, reject) => {
            EmployeeEducationDetails.create(obj)
                .then((data) => {
                    resolve(data.EmployeeEducation_Id);
                })
                .catch((error) => {
                    logger.error('Error has occured in employee-education-details-model/addEducation.', error);
                    reject(null);
                })
        })
    }

    /**
   * update operation in  Candidate Employment Experience
   * @param {*} employeeDetailsId : logged in employee Id
   * @param {*} resumeId : logged in employee resume Id
   * @param {*} experience : experience object
   */
    updateExperience(employeeDetailsId, resumeId, experiences) {
        let obj = {
            CandidateEmploymentExperience_Id: experiences.employeeEducationId,
            Resume_Id: resumeId,
            Employer_Name: experiences.employerName,
            Position_Title: experiences.positionTitle,
            PositionResponsibilities: experiences.positionResponsibilities,
            Position_StartDate: experiences.positionStartDate,
            Position_EndDate: experiences.positionEndDate,
            CityId: experiences.cityId,
            StateId: experiences.stateId,
            Modified_By: employeeDetailsId,
            Modified_Date: new Date()
        }

        return new Promise((resolve, reject) => {
            EmployeeEducationDetails.update(obj,
                {
                    where: [{
                        EmployeeEducation_Id: ~~obj.EmployeeEducation_Id,
                        EmployeeDetails_Id: ~~employeeDetailsId
                    }]
                })
                .then((data) => {
                    resolve(obj.EmployeeEducation_Id);
                })
                .catch((error) => {
                    logger.error('Error has occured in employee-education-details-model/updateEducation.', error);
                    reject(null);
                })
        })
    }

    /**
     * Delete experiences
     * @param {*} employeeEducationId :employeeEducation Id
     */
    deleteExperience(employeeEducationId) {
        let query = "DELETE from CandidateEmploymentExperience where CandidateEmploymentExperience_Id=\'" + reqData.candidateEmploymentExperienceId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }
}