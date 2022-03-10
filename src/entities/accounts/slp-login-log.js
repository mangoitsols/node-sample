/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define UserLoginDetail model -------------
 */
const SlpLoginLog = dbContext.define('slp_login_log', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field : "Log_Id"
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field : "Employee_Details_Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field : "Resume_Id"
    },
    loginDatetime: {
        type: Sequelize.STRING,
        field : "login_datetime"
    },
    ipAddress: {
        type: Sequelize.STRING,
        field : "ip_address"
    },    
    platform: {
        type: Sequelize.STRING,
        field : "Platform"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


module.exports = {
    SlpLoginLog: SlpLoginLog,
}