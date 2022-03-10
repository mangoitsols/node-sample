/**
 *  -------Import all classes and packages -------------
*/
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define Candidate_ResumeAndDoc model -------------
 */
const Candidate_ResumeAndDoc = dbContext.define('Candidate_ResumeAndDoc', {
    candidateDocId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field:"CandidateDoc_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field:"Resume_Id"
    },
    filePath: {
        type: Sequelize.STRING,
        field:"Resume_File"
    },
    fileName: {
        type: Sequelize.STRING,
        field:"File_name"
    },
    isPrimary: {
        type: Sequelize.INTEGER,
        field:"IsPrimary"
    },
    dataInsertFrom: {
        type: Sequelize.INTEGER,
        field:"DataInsertFrom"
    },
    docType: {
        type: Sequelize.INTEGER,
        field:"Doc_Type"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field:"Created_By"
    },
    createdDate: {
        type: Sequelize.DATE,
        field:"Created_Date",
        // defaultValue: new Date()
    },
    modifiedBy: {
        type: Sequelize.INTEGER,
        field:"Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field:"Modified_Date",
        //defaultValue: new Date()
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    },
    dmsId: {
        type: Sequelize.INTEGER,
        field:"DMS_Id"
    }
});

module.exports = {
    Candidate_ResumeAndDoc: Candidate_ResumeAndDoc,
}