/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define PT_PlacementTracker model -------------
 */
const PtPlacementTracker = dbContext.define('PT_PlacementTracker', {
    placementTrackerId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "PlacementTracker_Id"
    },
    customerId: {
        type: Sequelize.STRING,
        field: "Customer_Id"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    },
    consultantType: {
        type: Sequelize.INTEGER,
        field: "Consultant_Type"
    },
    placementStatus : {
        type: Sequelize.INTEGER,
        field: "Status"
    }
    // bgCheckEnvStatus: {
    //     type: Sequelize.INTEGER,
    //     field: "BGCheck"
    // },
    // clientEnvStatus: {
    //     type: Sequelize.INTEGER,
    //     field: "OnBoardingClientDocCompAggr"
    // },
    // benefitsEnvStatus: {
    //     type: Sequelize.INTEGER,
    //     field: "Benefits"
    // },
    // bgUpdatedOn: {
    //     type: Sequelize.DATE,
    //     field: "BGCheckCompletedDate"
    // },
    // offerLetterUpdatedOn: {
    //     type: Sequelize.DATE,
    //     field: "OfferLetterCompletedDate"
    // },
    // clientEnvUpdatedOn: {
    //     type: Sequelize.DATE,
    //     field: "OnBoardingClientDocCompAggr_CompDate"
    // },
    // benefitsEnvUpdatedOn: {
    //     type: Sequelize.DATE,
    //     field: "Benefits_CompDate"
    // },  
    

});

module.exports = {
    PtPlacementTracker: PtPlacementTracker
}