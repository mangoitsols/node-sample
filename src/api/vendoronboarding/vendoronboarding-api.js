/**
 *  -------Import all classes and packages -------------
 */
import express from 'express';
import VendorOnboardingController from '../../controllers/vendoronboarding/vendoronboarding-controller.js';
/**
 * -------Initialize global variabls-------------
 */
let app = express();
let router = express.Router();
let vendoronboardingController = new VendorOnboardingController();

/**
 *  -------Declare all routes-------------
 */


router.post('/vendoronboarding/hscallback', vendoronboardingController.saveEvents.bind(vendoronboardingController));
router.post('/vendoronboarding/sendsignaturemail', vendoronboardingController.sendSignatureRequestMail.bind(vendoronboardingController))
router.post('/vendoronboarding/writefile', vendoronboardingController.createZipFile)

/*-----------------------------------*/
let routerVendoronboardingCheck = router.route('/vendoronboarding/check');
router.get('/vendoronboarding/templates', vendoronboardingController.getAllTemplates);
router.post('/vendoronboarding/templates', vendoronboardingController.getAllTemplates);
router.post('/vendoronboarding/signers', vendoronboardingController.getSignerByTemplateIds.bind(vendoronboardingController))
router.post('/vendoronboarding/signersinfo', vendoronboardingController.getSignerByTemplateIdsOther.bind(vendoronboardingController)) // ---- identical to /signer [speed check]
router.post('/vendoronboarding/getsignurl', vendoronboardingController.getSignUrlForOtherSigner.bind(vendoronboardingController))
router.get('/vendoronboarding/documents/:templateId', vendoronboardingController.getDocumentByTemplateId)
router.post('/vendoronboarding/filesurl', vendoronboardingController.getFilesUrlByTemplateId.bind(vendoronboardingController))
router.post('/vendoronboarding/uploadattachment', vendoronboardingController.uploadAttachment.bind(vendoronboardingController));
router.post('/vendoronboarding/deleteattachment', vendoronboardingController.deleteAttachment.bind(vendoronboardingController));
router.post('/vendoronboarding/createVendorEnvelope', vendoronboardingController.initiateEnvelopeProcess.bind(vendoronboardingController));
router.get('/vendoronboarding/signurl/:envelopeId', vendoronboardingController.callSignUrlWithEnvelope.bind(vendoronboardingController))
router.post('/vendoronboarding/envelopefiles', vendoronboardingController.getEnvelopeFiles.bind(vendoronboardingController))
router.post('/vendoronboarding/downloadenvelope', vendoronboardingController.downloadEnvelopeFilesByEnvelopeId.bind(vendoronboardingController))
router.post('/vendoronboarding/createcode', vendoronboardingController.createCodeForSigner.bind(vendoronboardingController))


/**
 * ------ Bind all routes with related controller method-------------
 */

routerVendoronboardingCheck
    .post(vendoronboardingController.vendorOnboardingCheck.bind(vendoronboardingController));

module.exports = router;

