/**
 *  -------Import all classes and packages -------------
 */
import express from 'express';
import ActionsController from '../../controllers/actions/actions-controller.js';

/**
 * -------Initialize global variabls-------------
 */
let app = express();
let router = express.Router();
let actionsController = new ActionsController();

/**
 *  -------Declare all routes-----------
 */

let routerPostVerifyUserId = router.route('/actions/verifyUserId');
let routerPostVerifyPaswword = router.route('/actions/verifyPaswword');

/**
 * ------ Bind all routes with related controller method-------------
 */

routerPostVerifyPaswword
    .post(actionsController.verifyPaswword.bind(actionsController));

routerPostVerifyUserId
    .post(actionsController.verifyUserId.bind(actionsController));

module.exports = router;

