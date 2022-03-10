/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from "../../core/db";
import logger from "../../core/logger";
import configContainer from "../../config/localhost";
import { EmployeeEducationDetails } from "../../entities/profileManagement/employee-education-details";

/**
 *  -------Initialize global variabls-------------
 */
let config = configContainer.loadConfig();

export default class EducationDetailsModel {

    constructor() {
        //
    }

    /**
    * Get Education By EmployeeDetailsId
    * @param {*} employeeDetailsId : logged in employee details id 
    */
    getEducationByEmployeeDetailsId(employeeDetailsId) {
        let query = "EXEC API_SP_GetEducationDetailsByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }


    /**
  * Get education by employeeEducationId and EmployeeDetails id 
  * @param {*} employeeDetailsId : logged in employee details id
  * @param {*} employeeEducationId : employeeEducation Id
  */
    getEducationByEmployeeEducationId(employeeDetailsId, employeeEducationId) {
        return EmployeeEducationDetails.findOne({
            where: {
                EmployeeEducation_Id: ~~employeeEducationId,
                EmployeeDetails_Id: ~~employeeDetailsId
            },
            raw: true,
            attributes: [
                ["EmployeeEducation_Id", "employeeEducationId"],
                ["Qualification", "qualificationId"],
                ["Institution_Name", "institutionName"],
                ["PassingYear", "passingYear"],
                ["EmployeeDetails_Id", "employeeDetailsId"],
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
    * Add operation in  Employee Education Details
    * @param {*} employeeDetailsId : logged in employee id
    * @param {*} educations : education object
    */
    addEducation(employeeDetailsId, educations) {
         let obj = {           
            Qualification: educations.qualificationId,
            Institution_Name: educations.institutionName,
            PassingYear: educations.passingYear, 
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
   * update operation in  Employee Education Details
   * @param {*} employeeDetailsId : logged in employee id
   * @param {*} educations : education object
   */
    updateEducation(employeeDetailsId, educations) {
        let obj = {
            EmployeeEducation_Id: educations.employeeEducationId,
            Qualification: educations.qualificationId,
            Institution_Name: educations.institutionName,
            PassingYear: educations.passingYear, 
            EmployeeDetails_Id: employeeDetailsId,                    
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
     * Delete education
     * @param {*} employeeEducationId :employeeEducation Id
     */
    deleteEducation(employeeEducationId) {
        let query = "DELETE from EmployeeEducationDetails where EmployeeEducation_Id=\'" + employeeEducationId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }
}