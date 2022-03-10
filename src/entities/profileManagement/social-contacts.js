/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define SocialContacts model -------------
 */

const SocialContacts = dbContext.define('Resume_SocialContacts', {
    socialContactsId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "ResumeSocialContacts_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field: "Resume_Id"
    },
    appRefId: {
        type: Sequelize.INTEGER,
        field: "App_Ref_Id"
    },
    contactLabel: {
        type: Sequelize.STRING,
        field: "Contact_Label"
    },
    contactValue: {
        type: Sequelize.STRING,
        field: "Contact_Value"
    },
    createdDate: {
        type: Sequelize.DATE,
        field: "Created_Date"
    },
    createdBy: {
        type: Sequelize.INTEGER,
        field: "Created_By"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


module.exports = {
    SocialContacts: SocialContacts
}