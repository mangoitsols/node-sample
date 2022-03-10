/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';


/**
 *  -------Define EmployeeDetails model -------------
 */
const AccountChangePassword = dbContext.define('EmployeeDetails', {
    Email_Id: {
        type: Sequelize.STRING
    }    ,
    Password: {
        type: Sequelize.STRING
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


module.exports = {
    AccountChangePassword:AccountChangePassword,
}