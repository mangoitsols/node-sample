/**
 *  -------Import all classes and packages -------------
 */
import express from 'express';
import EmployeeonboardingController from '../../controllers/employeeonboarding/employeeonboarding-controller.js';
/**
 *  -------Initialize global variables-------------
 */
let app = express();
let router = express.Router();
let employeeonboardingController = new EmployeeonboardingController();

/**
 *  -------Declare all routes-------------
 */

router.get('/employee/offerletter', employeeonboardingController.getOfferLetter)
router.post('/employee/offerletter', employeeonboardingController.updateOfferLetter.bind(employeeonboardingController))
// router.post('/employee/hscallback', employeeonboardingController.helloSignCallback)
router.get('/employee/templates', employeeonboardingController.getAllTemplates)
router.post('/employee/templates', employeeonboardingController.getAllTemplates)
router.post('/employee/signerorder', employeeonboardingController.getSignerOrderByTemplates)
router.post('/employee/createenvelope', employeeonboardingController.initiateEnvelopeProcess.bind(employeeonboardingController))
router.get('/employee/documents/:templateId', employeeonboardingController.getDocumentByTemplateId)
router.post('/employee/filesurl', employeeonboardingController.getFilesUrlByTemplateId.bind(employeeonboardingController))
router.post('/employee/hscallback', employeeonboardingController.saveEvents.bind(employeeonboardingController))
router.post('/employee/envelopefiles', employeeonboardingController.getEnvelopeFiles.bind(employeeonboardingController))
router.post('/employee/uploadattachment', employeeonboardingController.uploadAttachment.bind(employeeonboardingController))
router.get('/employee/attachment', employeeonboardingController.getAttachment.bind(employeeonboardingController))
router.post('/employee/attachment', employeeonboardingController.uploadAttachment.bind(employeeonboardingController))
router.post('/employee/deleteattachment', employeeonboardingController.deleteAttachment.bind(employeeonboardingController))
router.delete('/employee/attachment', employeeonboardingController.deleteAttachment.bind(employeeonboardingController))
router.post('/employee/signers', employeeonboardingController.getSignerByTemplateIds.bind(employeeonboardingController))
router.post('/employee/signersinfo', employeeonboardingController.getSignerByTemplateIdsOther.bind(employeeonboardingController)) // ---- identical to /signer [speed check]
router.post('/employee/sendsignaturemail', employeeonboardingController.sendSignatureRequestMail.bind(employeeonboardingController))
router.post('/employee/createcode', employeeonboardingController.createCodeForSigner.bind(employeeonboardingController))
router.get('/employee/benefit', employeeonboardingController.updateBenefit.bind(employeeonboardingController))
router.post('/employee/downloadenvelope', employeeonboardingController.downloadEnvelopeFilesByEnvelopeId.bind(employeeonboardingController))

// router.get('/employee/getsignurl', employeeonboardingController.callSignUrl.bind(employeeonboardingController))
router.post('/employee/getsignurl', employeeonboardingController.getSignUrlForOtherSigner.bind(employeeonboardingController))
router.get('/employee/signurl/:envelopeId', employeeonboardingController.callSignUrlWithEnvelope.bind(employeeonboardingController))
router.post('/employee/saveParams', employeeonboardingController.saveUtmParams.bind(employeeonboardingController))

router.get('/employee/templatemergeddocs/:templateId', employeeonboardingController.getHsDocumentUrlByTemplateId)
router.post('/employee/writefile', employeeonboardingController.createZipFile)

router.post('/employee/test', employeeonboardingController.test.bind(employeeonboardingController))
router.post('/employee/authcode', employeeonboardingController.updateAuthCode.bind(employeeonboardingController))





module.exports = router;