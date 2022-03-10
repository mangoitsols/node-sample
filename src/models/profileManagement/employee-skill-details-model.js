/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from "../../core/db";
import logger from "../../core/logger";
import configContainer from "../../config/localhost";
import { EmployeeSkillDetails } from "../../entities/profileManagement/employee-skill-details";

/**
 *  -------Initialize global variabls-------------
 */
let config = configContainer.loadConfig();

export default class SkillDetailsModel {

    constructor() {
        //
    }

    /**
   * Get Skills By EmployeeDetailsId
   * @param {*} employeeDetailsId : logged in employee details id 
   */
    getSkillsByEmployeeDetailsId(employeeDetailsId) {
        let query = "EXEC API_SP_GetSkillsByEmployeeDetId @EmployeeDetails_Id=\'" + ~~employeeDetailsId + "\'";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }


    /**
  * Get skills by employeeSkillDetailsId and EmployeeDetails id 
  * @param {*} employeeDetailsId : logged in employee details id
  * @param {*} employeeSkillDetailsId : employeeSkillDetails Id
  */
    getSkillsByEmployeeSkillDetailsId(employeeDetailsId, employeeSkillDetailsId) {
        return EmployeeSkillDetails.findOne({
            where: {
                EmployeeSkillDetails_Id: ~~employeeSkillDetailsId,
                EmployeeDetails_Id: ~~employeeDetailsId
            },
            raw: true,
            attributes: [
                ["EmployeeSkillDetails_Id","employeeSkillDetailsId"],
                ["Skill_Id", "skillId"],
                ["Years", "years"],
                ["Months", "months"],
                ["EmployeeDetails_Id", "employeeDetailsId"],
                ["Created_Date", "createdDate"],
                ["Created_By", "createdBy"]
            ]
        })
            .then((skills) => {
                skills = JSON.parse(JSON.stringify(skills).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
                return skills;
            });
    }

    /** 
    * Add operation in  employee skills details
    * @param {*} employeeDetailsId : logged in employee id
    * @param {*} skills : skills object
    */
    addSkill(employeeDetailsId, skills) {
        let obj = {
            Skill_Id: skills.skillId,
            Years: skills.years,
            Months: skills.months,
            EmployeeDetails_Id: employeeDetailsId,
            Created_Date: new Date(),
            Created_By: employeeDetailsId
        }
        return new Promise((resolve, reject) => {
            EmployeeSkillDetails.create(obj)
                .then((data) => {
                    resolve(data.EmployeeSkillDetails_Id);
                })
                .catch((error) => {
                    logger.error('Error has occured in employee-skill-details-model/addSkill.', error);
                    reject(null);
                })
        })
    }

    /**
   * update operation in  employee skills details
   * @param {*} employeeDetailsId : logged in employee id
   * @param {*} objSkills : skills object
   */
    updateSkill(employeeDetailsId, skills) {
        let obj = {
            EmployeeSkillDetails_Id: skills.employeeSkillDetailsId,
            Skill_Id: skills.skillId,
            Years: skills.years,
            Months: skills.months,
            EmployeeDetails_Id: employeeDetailsId,            
            Modified_By: employeeDetailsId,
            Modified_Date: new Date()
        }

        return new Promise((resolve, reject) => {
            EmployeeSkillDetails.update(obj,
                {
                    where: [{
                        EmployeeSkillDetails_Id: ~~obj.EmployeeSkillDetails_Id,
                        EmployeeDetails_Id: ~~employeeDetailsId
                    }]
                })
                .then((data) => {
                    resolve(obj.EmployeeSkillDetails_Id);
                })
                .catch((error) => {
                    logger.error('Error has occured in employee-skill-details-model/updateSkills.', error);
                    reject(null);
                })
        })
    }

    /**
     * Delete Skills 
     * @param {*} employeeSkillDetailsId :  skill id
     */
    deleteSkill(employeeSkillDetailsId) {
        let query = "DELETE from EmployeeSkillDetails where EmployeeSkillDetails_Id=\'" + ~~employeeSkillDetailsId + "\' ";
        return dbContext.query(query, { type: dbContext.QueryTypes.SELECT })
            .then((details) => {
                return details;
            })
    }
}
