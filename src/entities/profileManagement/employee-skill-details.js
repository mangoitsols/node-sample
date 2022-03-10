/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';

/**
 *  -------Define EmployeeSkillDetails model -------------
 */
const EmployeeSkillDetails = dbContext.define('EmployeeSkillDetails', {
    employeeSkillDetailsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "EmployeeSkillDetails_Id"
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field: "EmployeeDetails_Id"
    },
    skillId: {
        type: Sequelize.INTEGER,
        field: "Skill_Id"
    },
    skillType: {
        type: Sequelize.INTEGER,
        field: "Skill_Type"
    },
    years: {
        type: Sequelize.INTEGER,
        field: "Years"
    },
    months: {
        type: Sequelize.INTEGER,
        field: "Months"
    },
    lastUsed: {
        type: Sequelize.STRING,
        field: "Last_Used"
    },
    createdDate: {
        type: Sequelize.DATE,
        field: "Created_Date",
        defaultValue: new Date()
    },
    createdBy: {
        type: Sequelize.STRING,
        field: "Created_By"
    },
    modifiedBy: {
        type: Sequelize.STRING,
        field: "Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field: "Modified_Date",
        defaultValue: new Date()
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


module.exports = {
    EmployeeSkillDetails: EmployeeSkillDetails,
}