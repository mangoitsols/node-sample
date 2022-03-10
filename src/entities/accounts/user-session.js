/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define UserSession model -------------
 */
const UserSession = dbContext.define('UserSession', {
    SessionId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    EmployeeDetails_Id: {
        type: Sequelize.INTEGER
    },
    SessionUniqueId: {
        type: Sequelize.STRING
    },
    CreatedBy: {
        type: Sequelize.BIGINT
    },
    CreatedOn: {
        type: Sequelize.DATE
    },
    UpdatedBy: {
        type: Sequelize.BIGINT
    },   
    UpdatedOn: {
        type: Sequelize.DATE
     },   
    LastLoggedIn: {
        type: Sequelize.DATE
     },   
    Status: {
        type: Sequelize.BIGINT
     },   
    RowVersion: {
        type: Sequelize.INTEGER
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


module.exports = {
    UserSession: UserSession,
}