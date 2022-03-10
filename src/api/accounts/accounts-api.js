/**
 *  -------Import all classes and packages -------------
 */
import express from 'express';
import AccountsController from '../../controllers/accounts/accounts-controller.js';

/**
 * -------Initialize global variabls-------------
 */
let app = express();
let router = express.Router();
let accountsController = new AccountsController();

/**
 *  -------Declare all routes-------------
 */

let routerPostSignIn = router.route('/accounts/signin');
let routerPostSignUp = router.route('/accounts/signup');
// let routerPostSendOtp = router.route('/accounts/sendotp');
let routerPostResendEmail = router.route('/accounts/resendemail');
let routerPostChangePassword = router.route('/accounts/changepassword');
let routerGetSignOut = router.route('/accounts/signout');

router.post('/accounts/forgotpassword', accountsController.forgotPassword)




// login API's
let routerPostAccountActivate = router.route('/accounts/activate');
let routerPostUpdateEmail = router.route('/accounts/updateemail');

// let routerPostLinkedinSignIn = router.route('/accounts/linkedinsignin');
// let routerPostFacebooksignin = router.route('/accounts/facebooksignin');
// let routerPostGoogleSignIn = router.route('/accounts/googlesignin');
let routerPostResetPassword = router.route('/accounts/resetpassword');
router.post('/accounts/login', accountsController.loginByGuid.bind(accountsController));
router.post('/accounts/loginwithcode', accountsController.loginWithCode.bind(accountsController));
router.post('/accounts/privilege-access', accountsController.privilegeAccess.bind(accountsController));
router.post('/accounts/passport-access', accountsController.passportAccess.bind(accountsController));

router.post('/accounts/mailtrain-access', accountsController.mailtrainAccess.bind(accountsController));

router.post('/accounts/verifycode', accountsController.verifyCode);
router.post('/accounts/createpassword', accountsController.createPassword.bind(accountsController));

router.post('/accounts/createcode', accountsController.createCode);
router.post('/accounts/jobsearchstatus', accountsController.updateUserJobSearchStatus);
router.post('/accounts/actively-looking', accountsController.updateUserActivelyLooking);
router.get('/accounts/checkapiupdate', accountsController.checkApiUpdate);
router.post('/accounts/generateauth', accountsController.routerPostGenerateAuth.bind(accountsController));
router.post('/accounts/notinterested', accountsController.notInterestedForJob.bind(accountsController));


router.post('/accounts/testqcode', accountsController.test.bind(accountsController));

router.post('/accounts/verfiy-session-key', accountsController.verifySessionKey.bind(accountsController));

router.post('/accounts/signin-from-portal', accountsController.signinFromPortal.bind(accountsController));
router.post('/accounts/signin-to-portal', accountsController.signinToPortal.bind(accountsController));


/**
 * ------ Bind all routes with related controller method-------------
 */
routerGetSignOut
    .get(accountsController.signOut.bind(accountsController));

// routerPostSendOtp
//     .post(accountsController.generateOTP.bind(accountsController));

routerPostSignIn
    .post(accountsController.signIn.bind(accountsController));

routerPostSignUp
    .post(accountsController.signUp.bind(accountsController));

routerPostResetPassword
    .post(accountsController.resetPassword.bind(accountsController));

routerPostChangePassword
    .post(accountsController.changePassword.bind(accountsController));

// routerPostLinkedinSignIn
//     .post(accountsController.linkedinSignIn.bind(accountsController));

// routerPostFacebooksignin
//     .post(accountsController.facebookSignIn.bind(accountsController));

// routerPostGoogleSignIn
//     .post(accountsController.googleSignIn.bind(accountsController));

routerPostAccountActivate.post(accountsController.accountVerifyAndActivate.bind(accountsController));

routerPostUpdateEmail.post(accountsController.verifyAndUpdateEmail.bind(accountsController));

// routerPostAccountActivate.post(accountsController.accountActivate.bind(accountsController));

// routerPostCreatePassword.post(accountsController.postCreatePassword.bind(accountsController));

// routerPostResendEmail.post(accountsController.postResendEmail.bind(accountsController));
routerPostResendEmail.post(accountsController.resendActivationMail.bind(accountsController));

module.exports = router;

