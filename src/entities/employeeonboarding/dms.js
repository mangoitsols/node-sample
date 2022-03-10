/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define DMS model -------------
 */
const DMS = dbContext.define('DMS', {
    dmsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "DMS_Id"
    },
    documentModule: {
        type: Sequelize.INTEGER,
        field: "Document_Module"
    },
    empClientVendorId: {
        type: Sequelize.STRING(50),
        field: "EmpClientVendor_Id"
    },
    employeeId: {
        type: Sequelize.STRING,
        field: "EmployeeId"
    },
    fileName: {
        type: Sequelize.STRING(500),
        field: "File_Name"
    },
    documentName: {
        type: Sequelize.STRING(500),
        field: "Document_Name"
    },
    folderName: {
        type: Sequelize.STRING(500),
        field: "FolderName"
    },
    createdDate: {
        type: Sequelize.DATE,
        field: "Created_Date"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field: "Created_By"
    },
    showToConslt: {
        type: Sequelize.INTEGER,
        field: "LegalDoc_ShowToConslt"
    },
    updateBy: {
        type: Sequelize.INTEGER,
        field: "Update_By"
    },
    updateDate: {
        type: Sequelize.DATE,
        field: "Updated_On"
    },
    status: {
        type: Sequelize.INTEGER,
        field: "Status"
    },
    dataInsertFrom: {
        type: Sequelize.INTEGER,
        field: "DataInsertFrom"
    },
    legalAppId: {
        type: Sequelize.INTEGER,
        field: "LEGALAPPID"
    },
    legalDocId: {
        type: Sequelize.INTEGER,
        field: "LEGALDOCID"
    },
    placementTrackerId: {
        type: Sequelize.INTEGER,
        field: "PlacementTracker_Id"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    },
    vm_Vendor_Id: {
        type: Sequelize.INTEGER,       
        field: "vm_Vendor_Id"
    },
    Document_Id: {
        type: Sequelize.INTEGER,       
        field: "Document_Id"
    },
    DocumentType: {
        type: Sequelize.INTEGER,       
        field: "DocumentType"
    },
    RefId1: {
        type: Sequelize.INTEGER,
        field: "RefId1"
    },
    RefId2: {
        type: Sequelize.INTEGER,
        field: "RefId2"
    },
    BaseUrlTypeId: {
        type: Sequelize.INTEGER,
        field: "BaseUrlTypeId"
    }
});

module.exports = {
    DMS: DMS
}