/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define CandidateSubmittedDocs model -------------
 */
const CandidateSubmittedDocs = dbContext.define('CandidateSubmittedDocs', {
    submittedDocId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field : "SubmittedDoc_Id"
    },
    resumeSubmissionId: {
        type: Sequelize.INTEGER,
        field: "ResumeSubmission_Id"
    },    
    documentId: {
        type: Sequelize.INTEGER,
        field: "Document_Id"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field:"Created_By"
    },
    createdDate: {
        type: Sequelize.DATE,
        field:"Created_Date",
        defaultValue: new Date()
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }

    
});


module.exports = {
    CandidateSubmittedDocs: CandidateSubmittedDocs,
}