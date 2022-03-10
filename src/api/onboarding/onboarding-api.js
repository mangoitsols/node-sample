/**
 *  -------Import all classes and packages -------------
 */
import express from 'express';
import OnboardingController from '../../controllers/onboarding/onboarding-controller.js';

/**
 *  -------Initialize global variables-------------
 */
let app = express();
let router = express.Router();
let onboardingController = new OnboardingController();

/**
 *  -------Declare all routes-------------
 */

// router.post('/onboarding/uploadresume', onboardingController.uploadResume);
// router.post('/onboarding/basicdetails', onboardingController.basicDetails);

router.post('/users/onboarding', onboardingController.editUser.bind(onboardingController));



module.exports = router;
