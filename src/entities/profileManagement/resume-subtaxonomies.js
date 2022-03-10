/**
 *  -------Import all classes and packages -------------
 */
import { dbContext, Sequelize } from '../../core/db';
import enums from '../../core/enums';
/**
 *  -------Define APP_REF_DATA model -------------
 */

const resumeSubTaxonomies = dbContext.define('resume_subtaxonomies', {
    resumeSubTaxonomyId: {
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
    subTaxonomyId: {
        type: Sequelize.INTEGER,
        field: "SubTaxonomyId"
    },
    subTaxonomy: {
        type: Sequelize.STRING,
        field: "SubTaxonomy"
    },
    percent: {
        type: Sequelize.DECIMAL,
        field: "PercentOfOverall",
        defaultValue: null
    },
    parentPercent: {
        type: Sequelize.DECIMAL,
        field: "PercentOfParent",
        defaultValue: 110
    },
    CompanyMaster_Id:{
        type: Sequelize.INTEGER,
        field: "CompanyMaster_Id",
        default: enums.compnayMaster.default
    }

});


module.exports = {
    resumeSubTaxonomies: resumeSubTaxonomies
}