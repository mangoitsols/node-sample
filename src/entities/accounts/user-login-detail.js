/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define UserLoginDetail model -------------
 */
const UserLoginDetail = dbContext.define('UserLoginDetail', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field : "MobileDeviceDetail_Id"
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field : "EmployeeDetails_Id"
    },
    deviceId: {
        type: Sequelize.STRING,
        field : "DeviceId"
    },
    isDeviceLogin: {
        type: Sequelize.INTEGER,
        field : "IsDeviceLogin"
    },
    isWebLogin: {
        type: Sequelize.INTEGER,
        field : "IsWebLogin"
    },
    deviceVersion: {
        type: Sequelize.STRING,
        field : "DeviceVersion"
    },   
    deviceName: {
        type: Sequelize.STRING,
        field : "DeviceName"
    },   
    os: {
        type: Sequelize.STRING,
        field : "OS_Type"
    },
    lat: {
        type: Sequelize.STRING,
        field : "Latitude"
    },    
    long: {
        type: Sequelize.STRING,
        field : "Longitude"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
});


module.exports = {
    UserLoginDetail: UserLoginDetail,
}