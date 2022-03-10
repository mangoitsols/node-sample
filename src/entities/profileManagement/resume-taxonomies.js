/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define APP_REF_DATA model -------------
 */

const resumeTaxonomies = dbContext.define('resume_taxonomies', {
    resumeTaxonomyId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "Id"
    },
    resumeId: {
        type: Sequelize.INTEGER,
        field: "Resume_Id"
    },
    taxonomyId: {
        type: Sequelize.INTEGER,
        field: "TaxonomyId"
    },
    taxonomy: {
        type: Sequelize.STRING,
        field: "Taxonomy"
    },
    percent: {
        type: Sequelize.DECIMAL,
        field: "PercentOfOverall",
        defaultValue: 110
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }

});


module.exports = {
    resumeTaxonomies: resumeTaxonomies
}