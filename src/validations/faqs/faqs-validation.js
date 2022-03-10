import CommonMethods from "../../core/common-methods";


 let commonMethods = new CommonMethods();

export default class FaqValidation{
    getFaqValidation(faqType){
        let err=[];
        if(!faqType){
            err.push('faqType');
        }
        else if (!commonMethods.isValidNumber(faqType)){
            err.push('faqType');
        }
        return err;
    }
}