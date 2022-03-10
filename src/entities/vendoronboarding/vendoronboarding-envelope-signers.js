/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define Onboarding_Vendor_Envelope_Signers model -------------
 */

const OnBoardingVendorEnvelopeSigners = dbContext.define('Onboarding_Vendor_Envelope_Signers', {
    onBoardingEnvelopeSignerId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "OnBoarding_Envelope_SignerId"
    },
    onBoardingEnvelopeId: {
        type: Sequelize.INTEGER,
        field: "OnBoarding_EnvelopeId"
    },
    signerRole: {
        type: Sequelize.STRING(500),
        field: "Signer_Role"
    },
    signerOrder: {
        type: Sequelize.INTEGER,
        field: "Signer_Order"
    },
    signingProviderEnvelopeId: {
        type: Sequelize.TEXT,
        field: "SigningProvider_EnvelopeId"
    },
    Vendor_Id: {
        type: Sequelize.INTEGER,
        field: "Vendor_Id"
    },
    envelopeSignerId: {
        type: Sequelize.STRING(500),
        field: "Envelope_SignerId"
    },
    envelopeSignerName: {
        type: Sequelize.STRING(500),
        field: "Envelope_Signer_Name"
    },
    envelopeSignerEmail: {
        type: Sequelize.STRING(500),
        field: "Envelope_Signer_Email"
    },
    envelopeSignerStatus: {
        type: Sequelize.STRING,
        field: "Envelope_Signer_Status"
    },
    envelopeSignerSignedAt: {
        type: Sequelize.DATE,
        field: "Envelope_Signer_Signed_At"
    },
    envelopeSignerLastViewedAt: {
        type: Sequelize.DATE,
        field: "Envelope_Signer_LastViewed_At"
    },
    envelopeSignerLastRemindedAt: {
        type: Sequelize.DATE,
        field: "Envelope_Signer_LastReminded_At"
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
    isVendor: {
        type: Sequelize.INTEGER,
        field: "isVendor"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
    

});

module.exports = {
    OnBoardingVendorEnvelopeSigners: OnBoardingVendorEnvelopeSigners
}
