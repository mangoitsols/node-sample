/**
 *  -------Import all classes and packages -------------
 */
import express from 'express';
import UserController from '../../controllers/profileManagement/profile-management-controller-v5';


/**
 *  -------Initialize global variabls-------------
 */
let app = express();
let router = express.Router();
let userController = new UserController();


/**
 *  -------Declare all routes-------------
 */
let routerGetUserProfile = router.route('/users');
let routerPutEditUser = router.route('/users');
let routerDeleteUsersProfileData = router.route('/users');
let routerGetLookups = router.route('/users/lookupdata');
let routerGetLookupsClear = router.route('/users/lookup/clearcache');
let routerResetEmailId = router.route('/users/resetemail');
router.get('/users/getsubdomain/:domainId([0-9]+)', userController.getSubDomainByParent.bind(userController));
router.get('/users/getOtherInformation/:domainId([0-9]+)', userController.getOtherInformationDomainByParent.bind(userController));


router.post('/chatbot/users/profile', userController.getProfileByGuid.bind(userController));
router.post('/chatbot/users/matching-job', userController.matchingJobs.bind(userController));
router.post('/mailtrain/users', userController.mailTrainUserList.bind(userController));
 
/**
 *  ------ Bind all routes with related controller method-------------
 */
routerGetUserProfile
    .get(userController.getUserProfile.bind(userController));

routerPutEditUser
    .put(userController.editUser.bind(userController));

routerDeleteUsersProfileData
    .delete(userController.deleteUsersProfileData.bind(userController));

routerGetLookups
    .get(userController.getAllLookups.bind(userController));

routerGetLookupsClear
    .get(userController.getAllLookupsClear.bind(userController));

routerResetEmailId
    .post(userController.resetEmail.bind(userController));



module.exports = router;