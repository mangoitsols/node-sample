/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';

/**
 *  -------Define EmployeeCertificationDetails model -------------
 */
const EmployeeCertificationDetails = dbContext.define('EmployeeCertificationDetails', {
    empCertificationDetailsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field:"EmpCertificationDetails_Id"
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field:"EmployeeDetails_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field:"Resume_Id"
    },
    certificateExamName: {
        type: Sequelize.STRING,
        field:"CertificateExam_Name"
    },
    issuedBy: {
        type: Sequelize.STRING,
        field:"Institution_Name"
    },
    certificateNumber: {
        type: Sequelize.STRING,
        field:"Certificate_Number"
    },
    certifiedDate: {
        type: Sequelize.DATE,
        field:"Certified_Date"
    },
    expiryRenewalDate: {
        type: Sequelize.DATE,
        field:"ExpiryRenewal_Date"
    },
    status: {
        type: Sequelize.INTEGER,
        field:"Status"
    },
    comments: {
        type: Sequelize.STRING,
        field:"Comments"
    },
    createdDate: {
        type: Sequelize.DATE,
        field:"Created_Date",
        defaultValue: new Date()
    },
    createdBy: {
        type: Sequelize.STRING,
        field:"Created_By"
    },
    modifiedBy: {
        type: Sequelize.STRING,
        field:"Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field:"Modified_Date",
        defaultValue: new Date()
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});

module.exports = {
    EmployeeCertificationDetails: EmployeeCertificationDetails,
}