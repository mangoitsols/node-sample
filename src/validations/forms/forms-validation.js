export default class FormsValidation {
    getFormsValidation(deptName,employeeDetailsId){
        let err=[];
        if(!employeeDetailsId){
            err.push('invalidAuthToken');
        }
        else if(!deptName){
            err.push('deptName');
        }
        return err;

    }
}