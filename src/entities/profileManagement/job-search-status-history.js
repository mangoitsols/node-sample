/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define JobSearchStatusHistory model -------------
 */
const JobSearchStatusHistory = dbContext.define('JobSearchStatusHistory', {
    jobSearchStatusHistoryId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "JobSearchStatusHistory_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field: "Resume_Id"
    },
    searchStatusOldId: {
        type: Sequelize.INTEGER,
        field: "SearchStatusOld_Id"
    },
    searchStatusNewId: {
        type: Sequelize.INTEGER,
        field: "SearchStatusNew_Id"
    },
    createdDate:{
        type: Sequelize.DATE,
        field: "Created_Date"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field: "Created_By"
    }
});

module.exports = {
    JobSearchStatusHistory: JobSearchStatusHistory
}