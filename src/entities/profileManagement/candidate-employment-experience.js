/**
 *  -------Import all classes and packages -------------
*/
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define CandidateEmploymentExperience model -------------
 */
const CandidateEmploymentExperience = dbContext.define('CandidateEmploymentExperience', {
    candidateEmploymentExperienceId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "CandidateEmploymentExperience_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field: "Resume_Id"
    },
    employerName: {
        type: Sequelize.TEXT,
        field: "Employer_Name"
    },
    subEmployerName: {
        type: Sequelize.TEXT,
        field: "SubEmployer_Name"
    },
    webSite: {
        type: Sequelize.TEXT,
        field: "WebSite"
    },
    address: {
        type: Sequelize.TEXT,
        field: "Address"
    },
    countryId: {
        type: Sequelize.INTEGER,
        field: "CountryId"
    },
    stateId: {
        type: Sequelize.INTEGER,
        field: "StateId"
    },
    cityId: {
        type: Sequelize.INTEGER,
        field: "CityId"
    },
    positionTitle: {
        type: Sequelize.TEXT,
        field: "Position_Title"
    },
    positionStartDate: {
        type: Sequelize.DATE,
        field: "Position_StartDate"
    },
    positionEndDate: {
        type: Sequelize.DATE,
        field: "Position_EndDate",
        allowNull: true,
    },
    positionCategory: {
        type: Sequelize.STRING,
        field: "Position_Category"
    },
    positionLevel: {
        type: Sequelize.TEXT,
        field: "PositionLevel"
    },
    positionResponsibilities: {
        type: Sequelize.TEXT,
        field: "PositionResponsibilities"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field: "Created_By"
    },
    createdDate: {
        type: Sequelize.DATE,
        field: "Created_Date",
        defaultValue: new Date()
    },
    modifiedBy: {
        type: Sequelize.INTEGER,
        field: "Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field: "Modified_Date",
        defaultValue: new Date()
    },
    otherCity: {
        type: Sequelize.TEXT,
        field: "City_Other"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});

module.exports = {
    CandidateEmploymentExperience: CandidateEmploymentExperience,
}