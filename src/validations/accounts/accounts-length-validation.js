/**
 * field names in account section
 */
let accountFieldName =
    {
        firstNameLength: "firstNameLength",
        lastNameLength: "lastNameLength",
        emailLength: "emailLength",
        userNameLength: "userNameLength",

    };

/**
 * length validation on fields in accounts
 */
let validations = [
    {
        "FieldName": accountFieldName.firstNameLength,
        "Length": 50
    },
    {
        "FieldName": accountFieldName.lastNameLength,
        "Length": 50
    },
    {
        "FieldName": accountFieldName.emailLength,
        "Length": 50
    },
    {
        "FieldName": accountFieldName.userNameLength,
        "Length": 50
    }
];

/**
 * length validation method
 * @param {*} code 
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
    lengthValidation: lengthValidation,
    accountFieldName: accountFieldName
}