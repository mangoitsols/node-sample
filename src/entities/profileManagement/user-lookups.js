/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define APP_REF_DATA model -------------
 */
const UserLookups = dbContext.define('APP_REF_DATA', {
    KeyID: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: false
    },
    KeyName: {
        type: Sequelize.STRING
    },
    ParentID: {
        type: Sequelize.INTEGER
    },
    Description: {
        type: Sequelize.STRING
    },
    Value: {
        type: Sequelize.STRING
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});

module.exports = {
    UserLookups: UserLookups  
}