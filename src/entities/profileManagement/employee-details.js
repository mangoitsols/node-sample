/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define EmployeeDetails model -------------
 */
const EmployeeDetails = dbContext.define('EmployeeDetails', {
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "EmployeeDetails_Id"
    },
    receiveNotification: {
        type: Sequelize.INTEGER,
        field: 'ReceiveNotification',
    },
    employeeId: {
        type: Sequelize.STRING,
        field: "PJEmployee_Id"
    },
    emailId: {
        type: Sequelize.STRING,
        field: "Email_Id",
        readonly: true
    },
    firstName: {
        type: Sequelize.STRING,
        field: 'First_Name'
    },
    lastName: {
        type: Sequelize.STRING,
        field: 'Last_Name'
    },
    employeeTypeId: {
        type: Sequelize.INTEGER,
        field: 'Employee_Type',
    },
    profilePicture: {
        type: Sequelize.STRING,
        field: "ProfilePicture"
    },
    dob: {
        type: Sequelize.DATE,
        field: "DOB",
        allowNull: true
    },
    // currentJobTitle: {
    //     type: Sequelize.STRING,
    //     field: "CurrentJobTitle"
    // },
    // authorisationStatusId: {
    //     type: Sequelize.STRING,
    //     field: "LegalFilingStatus",
    //     allowNull: true
    // },
    recruiter: {
        type: Sequelize.INTEGER,
        field: "Recruiter"
    },
    modifiedBy: {
        type: Sequelize.INTEGER,
        field: "Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field: "Modified_Date"
    },
    onlyLocationAccess: {
        type: Sequelize.INTEGER,
        field: "OnlyLocationAccess"
    },
    empStatus: {
        type: Sequelize.STRING,
        field: "emp_status"
    },
    isNewLogin: {
        type: Sequelize.INTEGER,
        field: "isNewLogin"
    },
    allowSms: {
        type: Sequelize.INTEGER,
        field: "SMSText_Receive"
    },
    isAccountActivated: {
        type: Sequelize.BOOLEAN,
        field: "isAccountActivated"
    },
    CompanyMaster_Id: {
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    },
    temporaryEmail: {
        type: Sequelize.STRING,
        field: "temporaryEmail"
    }
}, {
    hasTrigger: true
});

module.exports = {
    EmployeeDetails: EmployeeDetails,
}