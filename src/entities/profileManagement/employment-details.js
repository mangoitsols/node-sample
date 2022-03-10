/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
/**
 *  -------Define EmploymentDetails model -------------
 */
const EmploymentDetails = dbContext.define('EmploymentDetails', {
    employmentDetailsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "EmploymentDetails_Id",
        readonly: true
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field: "EmployeeDetails_Id",
        readonly: true
    },
    reportingManager: {
        type: Sequelize.INTEGER,
        field: 'ReportingManager',
        readonly: true
    },
    divisionHead: {
        type: Sequelize.INTEGER,
        field: "DivisionHead",
        readonly: true
    },
    workingLocation: {
        type: Sequelize.INTEGER,
        field: "WorkingLocation",
        readonly: true
    },
    divisionHead: {
        type: Sequelize.INTEGER,
        field: "DivisionHead",
        readonly: true
    },
    dailyWorkingHours: {
        type: Sequelize.INTEGER,
        field: 'DailyWorkingHours',
        readonly: true
    },
    grade: {
        type: Sequelize.INTEGER,
        field: 'Grade',
        readonly: true
    },
    designation: {
        type: Sequelize.INTEGER,
        field: 'Designation',
        readonly: true
    },
    workingShift: {
        type: Sequelize.INTEGER,
        field: "WorkingShift",
        readonly: true
    },
    employmentStatus: {
        type: Sequelize.INTEGER,
        field: "EmploymentStatus",
        readonly: true
    },
    noticePeriodDays: {
        type: Sequelize.INTEGER,
        field: "NoticePeriodDays",
        readonly: true
    },
    confirmationDueDate: {
        type: Sequelize.DATE,
        field: "ConfirmationDueDate",
        readonly: true
    },
    modifiedBy: {
        type: Sequelize.INTEGER,
        field: "Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field: "Modified_Date"
    }
}, {
    hasTrigger: true
});

module.exports = {
    EmploymentDetails: EmploymentDetails,
}