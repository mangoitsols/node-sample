/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define EmployeeEducationDetails model -------------
 */
const EmployeeEducationDetails = dbContext.define('EmployeeEducationDetails', {
    employeeEducationId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "EmployeeEducation_Id"
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field: "EmployeeDetails_Id"
    },
    qualificationId: {
        type: Sequelize.INTEGER,
        field: "Qualification"
    },
    affiliatedTo: {
        type: Sequelize.STRING,
        field: "Affiliated_To"
    },
    attendedFrom: {
        type: Sequelize.DATE,
        field: "Attended_From"
    },
    attendedTo: {
        type: Sequelize.DATE,
        field: "Attended_To"
    },
    countryId: {
        type: Sequelize.INTEGER,
        field: "Country_Id"
    },
    institutionName: {
        type: Sequelize.STRING,
        field: "Institution_Name"
    },
    remarks: {
        type: Sequelize.STRING,
        field: "Remarks"
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
    passingYear: {
        type: Sequelize.INTEGER,
        field: "PassingYear"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});

module.exports = {
    EmployeeEducationDetails: EmployeeEducationDetails,
}