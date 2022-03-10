/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define APP_REF_DATA model -------------
 */

const CandidateAchievement = dbContext.define('ResumeAchievementsDataType', {
    candidateAchievementId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "Auto_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field: "Resume_Id"
    },
    description: {
        type: Sequelize.TEXT,
        field: "Description"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


/* const CandidateAchievement = dbContext.define('CandidateAchievement', {
    candidateAchievementId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "CandidateAchievement_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field: "Resume_Id"
    },
    description: {
        type: Sequelize.STRING,
        field: "Description"
    },
    createdDate: {
        type: Sequelize.DATE,
        field: "Created_Date",
        defaultValue: new Date()
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field: "Created_By"
    }
}); */

module.exports = {
    CandidateAchievement: CandidateAchievement
}