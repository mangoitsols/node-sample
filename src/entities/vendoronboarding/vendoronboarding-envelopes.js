/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define OnBoarding_Vendor_Envelopes model -------------
 */


const OnBoardingVendorEnvelopes = dbContext.define('OnBoarding_Vendor_Envelopes', {
    onBoardingEnvelopeId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "OnBoarding_EnvelopeId"
    },
    envelopeType: {
        type: Sequelize.INTEGER,
        field: "EnvelopeType"
    },
    envelopeOrder: {
        type: Sequelize.INTEGER,
        field: "EnvelopeOrder"
    },
    envelopeStatus: {
        type: Sequelize.INTEGER,
        field: "EnvelopeStatus"
    },
    signingProviderEnvelopeId: {
        type: Sequelize.STRING(500),
        field: "SigningProvider_EnvelopeId"
    },
    signingProviderEnvelopeStatus: {
        type: Sequelize.INTEGER,
        field: "SigningProvider_Envelope_Status"
    },
    signingProvidersTemplateIds: {
        type: Sequelize.TEXT,
        field: "SigningProviders_TemplateIds"
    },
    signingProviderEnvelopeFinalURL: {
        type: Sequelize.TEXT,
        field: "SigningProvider_Envelope_FinalURL"
    },
    placementTrackerId: {
        type: Sequelize.INTEGER,
        field: "PlacementTracker_Id"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field: "Created_By"
    },
    createdOn: {
        type: Sequelize.DATE,
        field: "Created_On"
    },
    updatedBy: {
        type: Sequelize.INTEGER,
        field: "Updated_By"
    },
    updatedOn: {
        type: Sequelize.DATE,
        field: "Updated_On"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }

});

module.exports = {
    OnBoardingVendorEnvelopes: OnBoardingVendorEnvelopes
}
