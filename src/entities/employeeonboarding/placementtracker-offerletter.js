/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define PlacementTracker_OfferLetter model -------------
 */
const PtOfferLetter = dbContext.define('PlacementTracker_OfferLetter', {
    offerLetterId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "OfferLetter_ID"
    },
    placementTrackerId: {
        type: Sequelize.INTEGER,
        field: "PlacementTracker_Id"
    },
    offerLetterName: {
        type: Sequelize.STRING,
        field: "OfferLetter_Name"
    },
    issueDate: {
        type: Sequelize.DATE,
        field: "IssueDate"
    },
    CandidateName: {
        type: Sequelize.STRING,
        field: "CandidateName"
    },
    status: {
        type: Sequelize.INTEGER,
        field: "Status"
    },
    isAcceptedByCandidate: {
        type: Sequelize.INTEGER,
        field: "isAcceptedByCandidate"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }

});

module.exports = {
    PtOfferLetter: PtOfferLetter
}