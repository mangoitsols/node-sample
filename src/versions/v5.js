import express from 'express';
import responseFormat from '../core/response-format';

let app = express();
let router = express.Router();


router.use(function(req, res, next)
{   
    next();
})

router.use('/', require('../api/accounts/accounts-api')),
router.use('/', require('../api/jobs/jobs-api-v3')),
router.use('/', require('../api/lca/lca-api')),
router.use('/', require('../api/myProjects/my-projects-api')),
router.use('/', require('../api/news/news-api')),
router.use('/', require('../api/onboarding/onboarding-api')),
router.use('/', require('../api/payrolls/payrolls-api')),
router.use('/', require('../api/profileManagement/profile-management-api-v5')),
router.use('*', function(req, res){
	
	let response = responseFormat.createResponseTemplate();
	response = responseFormat.getResponseMessageByCodes(['common404'], { code: 404 });
	res.status(404).json(response);

});



module.exports = router;