/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define PT_Progress_details model -------------
 */
const PtProgressDetails = dbContext.define('PT_Progress_details', {
    progressDetailsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "PT_Progress_Details_Id"
    },
    offerLetter: {
        type: Sequelize.INTEGER,
        field: "OfferLetter"
    },
    placementTrackerId: {
        type: Sequelize.INTEGER,
        field: "PlacementTracker_Id"
    },
    bgCheckEnvStatus: {
        type: Sequelize.INTEGER,
        field: "BGCheck"
    },
    clientEnvStatus: {
        type: Sequelize.INTEGER,
        field: "OnBoardingClientDocCompAggr"
    },
    benefitsEnvStatus: {
        type: Sequelize.INTEGER,
        field: "Benefits"
    },
    bgUpdatedOn: {
        type: Sequelize.DATE,
        field: "BGCheckCompletedDate"
    },
    offerLetterUpdatedOn: {
        type: Sequelize.DATE,
        field: "OfferLetterCompletedDate"
    },
    clientEnvUpdatedOn: {
        type: Sequelize.DATE,
        field: "OnBoardingClientDocCompAggr_CompDate"
    },
    benefitsEnvUpdatedOn: {
        type: Sequelize.DATE,
        field: "Benefits_CompDate"
    },
    placementStatus : {
        type: Sequelize.INTEGER,
        field: "PlacementStatus"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    },
    VendorStatus: {
        type: Sequelize.INTEGER,
        field: "VendorOnBoarding"
    },

});

module.exports = {
    PtProgressDetails: PtProgressDetails
}