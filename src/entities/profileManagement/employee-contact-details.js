/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';

/**
 *  -------Define EmployeeContactDetails model -------------
 */
const EmployeeContactDetails = dbContext.define('EmployeeContactDetails', {
    EmployeeContactDetails_Id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeDetailsId: {
        type: Sequelize.INTEGER,
        field: "EmployeeDetails_Id"
    },
    /*contactNumber: {
        type: Sequelize.STRING,
        field: "Phone_Cell"
    },
    countryId: {
        type: Sequelize.INTEGER,
        field: "Country"
    },
    stateId: {
        type: Sequelize.STRING,
        field: "State",
        allowNull : true
    },
    cityId: {
        type: Sequelize.STRING,
        field: "City_Id"
    },
    currentLocation: {
        type: Sequelize.STRING,
        field: "Address1"
    },
    */
    zipCode: {
        type: Sequelize.STRING,
        field: "Zip_Code"
    },
    modifiedBy: {
        type: Sequelize.STRING,
        field: "Modified_By"
    },
    modifiedDate: {
        type: Sequelize.DATE,
        field: "Modified_Date"
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }

},
    // {
    // hooks: {
    //     beforeUpdate: function(model, options) {
    //         // console.log('hoook', model._previousDataValues);
    //         // console.log(model.dataValues, options);
    //         console.log(model)
    //         model.find({
    //                 where: {
    //                     EmployeeContactDetails_Id: model.EmployeeContactDetails_Id,
    //                     EmployeeDetails_Id: model.employeeDetailsId
    //                 },
    //                 raw: true,
    //                 attributes: [
    //                     ["EmployeeSkillDetails_Id","employeeSkillDetailsId"],                    
    //                 ]
    //             })
    //             .then((result) => {
    //                 console.log(result)
    //                 result = JSON.parse(JSON.stringify(result).replace(/'/g, "''").replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\""));
    //                 return result;
    //             });
    //     },
    // }
    // }
);

module.exports = {
    EmployeeContactDetails: EmployeeContactDetails,
}