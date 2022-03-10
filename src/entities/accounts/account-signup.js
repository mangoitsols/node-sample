/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';

/**
 *  -------Define EmployeeDetails model -------------
 */
const AccountSignUp = dbContext.define('EmployeeDetails', {

    EmployeeDetails_Id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    First_Name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                args: false, msg: 'First name cannot be an empty string.'
            },
            len: {
                args: [2, 50],
                msg: "Minimum length must be 2 characters and maximum length can be 50 characters."
            }
        }
    },
    Last_Name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                args: false, msg: 'Last name cannot be an empty string.'
            },
            len: {
                args: [2, 50],
                msg: "Minimum length must be 2 characters and maximum length can be 50 characters."
            }
        }
    },
    Email_Id: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: false,
            isEmail: {
                args: true, msg: "Invalid email id."
            },
            len: {
                args: [5, 50],
                msg: "Invalid email id."
            }
        }
    },
    Password: {
        type: Sequelize.STRING
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }
},{
    hasTrigger:true
});


module.exports = {
    AccountSignUp: AccountSignUp,
}