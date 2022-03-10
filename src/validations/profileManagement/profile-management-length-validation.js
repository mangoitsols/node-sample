/**
 * profile-management Validation
 */
let validations = [
    {
        "FieldName": "firstNameLength",
        "Length": 50
    },
    {
        "FieldName": "lastNameLength",
        "Length": 50
    },
    {
        "FieldName": "currentJobTitleLength",
        "Length": 250
    },
    {
        "FieldName": "authorisationStatusIdLength",
        "Length": 10
    },
    {
        "FieldName": "contactNumberLength",
        "Length": 20
    },
    {
        "FieldName": "jobSearchStatusIdLength",
        "Length": 10
    },
    {
        "FieldName": "totalExpLength",
        "Length": 10
    },
    {
        "FieldName": "totalExpLength",
        "Length": 10
    },
    {
        "FieldName": "totalExpLength",
        "Length": 10
    }, {
        "FieldName": "totalUsExpLength",
        "Length": 10
    }, {
        "FieldName": "addressLength",
        "Length": 500
    },
    {
        "FieldName": "countryIdLength",
        "Length": 10
    },
    {
        "FieldName": "stateIdLength",
        "Length": 10
    },
    {
        "FieldName": "cityIdLength",
        "Length": 10
    },
    {
        "FieldName": "otherCityLength",
        "Length": 50
    },
    {
        "FieldName": "zipCodeLength",
        "Length": 20
    },
    {
        "FieldName": "careerProfileLength",
        "Length": 2000
    },
    {
        "FieldName": "linkedInLength",
        "Length": 250
    },
    {
        "FieldName": "twitterLength",
        "Length": 250
    },
    {
        "FieldName": "facebookLength",
        "Length": 250
    },
    {
        "FieldName": "employeeSkillDetailsIdLength",
        "Length": 10
    },
    {
        "FieldName": "skillIdLength",
        "Length": 10
    },
    {
        "FieldName": "yearsOfExperienceLength",
        "Length": 10
    },
    {
        "FieldName": "employeeLicenseIdLength",
        "Length": 10
    },
    {
        "FieldName": "licenseTypeIdLength",
        "Length": 10
    },
    {
        "FieldName": "registeredStateIdLength",
        "Length": 10
    },
    {
        "FieldName": "licenceNumberLength",
        "Length": 200
    },
    {
        "FieldName": "empCertificationDetailsIdLength",
        "Length": 10
    },
    {
        "FieldName": "certificateNameLength",
        "Length": 50
    },
    {
        "FieldName": "issuedByLength",
        "Length": 50
    },
    {
        "FieldName": "employeeEducationIdLength",
        "Length": 10
    },
    {
        "FieldName": "degreeIdLength",
        "Length": 10
    },
    {
        "FieldName": "collegeOrSchoolLength",
        "Length": 250
    },
    {
        "FieldName": "countryIdLength",
        "Length": 9
    },
    {
        "FieldName": "attendedFromLength",
        "Length": 4
    },
    {
        "FieldName": "attendedToLength",
        "Length": 4
    },
    {
        "FieldName": "candidateDocIdLength",
        "Length": 10
    },
    {
        "FieldName": "fileNameLength",
        "Length": 250
    }
]

/**
 * length validation method in profile-management
 * @param {*} code : field name  
 */
function lengthValidation(code) {
    let returnMessage = undefined;
    for (let i = 0; i < validations.length; i++) {
        if (validations[i].FieldName === code) {
            returnMessage = validations[i].Length;
            break;
        }
    }
    return returnMessage;
}

module.exports = {
    lengthValidation: lengthValidation
}