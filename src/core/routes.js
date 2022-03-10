
/**
 *  -------Import all classes and packages -------------
 */
import lodash from 'lodash';
import CoreUtils from './core-utils';
import configContainer from '../config/localhost';

let config = configContainer.loadConfig();

/**
 *  Handle Exclude path which will only check Authorization key not Auth token 
 */
let excludeJwtPaths_base = [
    { url: '/accounts/signin', methods: ['POST'] },
    { url: '/accounts/signup', methods: ['POST'] },
    { url: '/free-lookup/domains', methods: ['GET'] },
    { url: '/accounts/sendotp', methods: ['POST'] },
    { url: '/accounts/forgotpassword', methods: ['POST'] },
    { url: '/accounts/resetpassword', methods: ['POST'] },
    { url: '/accounts/linkedinsignin', methods: ['POST'] },
    { url: '/accounts/facebooksignin', methods: ['GET', 'POST'] },
    { url: '/accounts/googlesignin', methods: ['GET', 'POST'] },
    { url: '/users/lookup/clear', methods: ['GET'] },
    { url: '/accounts/activate', methods: ['POST'] },
    { url: '/accounts/updateemail', methods: ['POST'] },
    { url: '/accounts/createpassword', methods: ['POST'] },
    { url: '/accounts/resendemail', methods: ['POST'] },
    { url: '/holidays/schedule', methods: ['GET'] },
    { url: '/faqs', methods: ['POST'] },
    { url: '/news', methods: ['GET'] },
    { url: '/timecards/contentpage', methods: ['GET'] },
    { url: '/interviewtips', methods: ['GET'] },
    { url: '/immigrationfiling', methods: ['GET'] },
    { url: '/benefits', methods: ['GET'] },
    { url: '/hr/abouthr', methods: ['GET'] },
    { url: '/contactus', methods: ['POST'] },
    { url: '/accounts/verifycode', methods: ['POST'] },
    { url: '/accounts/createcode', methods: ['POST'] },
    { url: '/accounts/testqcode', methods: ['POST'] },
    { url: '/accounts/loginwithcode', methods: ['POST'] },
    { url: '/accounts/privilege-access', methods: ['POST'] },
    { url: '/accounts/passport-access', methods: ['POST'] },
    { url: '/accounts/mailtrain-access', methods: ['POST'] },
    { url: '/accounts/notinterested', methods: ['POST'] },
    { url: '/mailprovider/sgcallback', methods: ['POST'] },
    { url: '/mailprovider/mxcallback', methods: ['POST'] },
    { url: '/mailprovider/getdate', methods: ['POST'] },
    { url: '/send-push', methods: ['GET'] },
    { url: '/mailtrain/users', methods: ['POST'] },
    { url: '/jobs/application-count', methods: ['POST'] },
    { url: '/actions/verifyPaswword', methods: ['POST'] },
    { url: '/actions/verifyUserId', methods: ['POST'] },
    { url: '/accounts/verfiy-session-key', methods: ['POST'] },
    { url: '/accounts/signin-from-portal', methods: ['POST'] },
    { url: '/accounts/signin-to-portal', methods: ['POST'] },
];

/**
 *  Handle API Path which can be access before login and after login  
 */

let accessAndAuthUrl_base = [
    { url: '/timecards/test', methods: ['POST'], regex: 0 },
    { url: '/jobs/statistics', methods: ['GET'], regex: 0 },
    { url: '/jobs/search', methods: ['POST'], regex: 0 },
    { url: '/jobs/apply', methods: ['POST'], regex: 0 },
    { url: '/jobs/alert', methods: ['POST'], regex: 0 },
    { url: '/test/error', methods: ['GET'], regex: 0 },
    { url: '/jobs/:cjmJobId([0-9]+)', methods: ['GET'], regex: 1, pattern: /api\/jobs\/([0-9]+)/ },
    { url: '/reportabug', methods: ['POST'], regex: 0 },
    { url: '/support-contacts', methods: ['GET'], regex: 0 },
    { url: '/jobs/suggestions', methods: ['POST'], regex: 0 },
    { url: '/jobs/similarjobs/:cjmJobId([0-9]+)', methods: ['GET'], regex: 1, pattern: /api\/jobs\/similarjobs\/([0-9]+)/ },
    { url: '/regions/location/search', methods: ['POST'], regex: 0 },
    { url: '/accounts/verifycode', methods: ['POST'], regex: 0 },
    { url: '/accounts/createcode', methods: ['POST'], regex: 0 },
    { url: '/accounts/activate', methods: ['POST'], regex: 0 },
    { url: '/accounts/updateemail', methods: ['POST'], regex: 0 },
    { url: '/accounts/jobsearchstatus', methods: ['POST'], regex: 0 },
    { url: '/accounts/actively-looking', methods: ['POST'], regex: 0 },
    { url: '/users/lookupdata', methods: ['GET'], regex: 0 },
    { url: '/regions/country', methods: ['GET'], regex: 0 },
    { url: '/accounts/checkapiupdate', methods: ['GET'], regex: 0 },
    { url: '/accounts/login', methods: ['POST'], regex: 0 },
    { url: '/chatbot/users/profile', methods: ['POST'], regex: 0 },
    { url: '/chatbot/users/matching-job', methods: ['POST'], regex: 0 },
    { url: '/chatbot/benefits/all', methods: ['POST'], regex: 0 },
    { url: '/chatbot/benefits/401k', methods: ['POST'], regex: 0 },
    { url: '/chatbot/immigrationlist', methods: ['POST'], regex: 0 },
    { url: '/employee/hscallback', methods: ['POST'], regex: 0 },
    { url: '/employee/templates', methods: ['GET', 'POST'], regex: 0 },
    { url: '/employee/documents/:templateId', methods: ['GET'], regex: 1, pattern: /api\/employee\/documents\/[0-9a-z]/ },
    { url: '/employee/createenvelope', methods: ['POST'], regex: 0 },
    { url: '/employee/filesurl', methods: ['POST'], regex: 0 },
    { url: '/employee/getsignurl', methods: ['POST'], regex: 0 },
    { url: '/employee/envelopefiles', methods: ['POST'], regex: 0 },
    { url: '/employee/signers', methods: ['POST'], regex: 0 },
    { url: '/employee/signersinfo', methods: ['POST'], regex: 0 },
    { url: '/employee/sendsignaturemail', methods: ['POST'], regex: 0 },
    { url: '/employee/createcode', methods: ['POST'], regex: 0 },
    { url: '/employee/downloadenvelope', methods: ['POST'], regex: 0 },

    { url: '/knowledge',methods : ['GET'], regex : 0},
    { url: '/knowledgecategory',methods : ['GET'], regex : 0},
    { url: '/knowledge/knowledgebycategory',methods : ['POST'], regex : 0},
    { url: '/knowledge/knowledgecenterdata',methods : ['POST'], regex : 0},
    { url: '/knowledge/knowledgecategorydesktop',methods : ['POST'], regex : 0},
    { url: '/knowledgedetails/:[0-9a-z]', methods: ['GET'], regex : 1, pattern: /api\/knowledgedetails\/[0-9a-z]/ },
    { url: '/knowledgedetails/:initiatedid', methods: ['GET'], regex : 1, pattern: /api\/knowledgedetails\/[0-9a-z]/ },
    { url: '/prescreening/save', methods: ['POST'], regex: 0  },
    { url: '/prescreening/check', methods: ['POST'], regex: 0  },
    { url: '/candidate/create', methods: ['POST'], regex: 0  },
    { url: '/vendoronboarding/hscallback', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/templates', methods: ['GET', 'POST'], regex: 0 },
    { url: '/vendoronboarding/documents/:templateId', methods: ['GET'], regex: 1, pattern: /api\/employee\/documents\/[0-9a-z]/ },
    { url: '/vendoronboarding/filesurl', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/getsignurl', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/envelopefiles', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/signers', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/signersinfo', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/sendsignaturemail', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/createcode', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/downloadenvelope', methods: ['POST'], regex: 0 },
    { url: '/vendoronboarding/uploadattachment', methods: ['POST'], regex: 0  },
    { url: '/vendoronboarding/deleteAttachment', methods: ['POST'], regex: 0  },
    { url: '/vendoronboarding/createVendorEnvelope', methods: ['POST'], regex: 0 },    
    { url: '/vendoronboarding/check', methods: ['POST'], regex: 0  },
    { url: '/vendoronboarding/writefile', methods: ['POST'], regex: 0  },
    { url: '/vendoronboarding/signurl/:envelopeId', methods: ['GET'], regex: 1, pattern: /api\/vendoronboarding\/signurl\/[0-9a-z]/ },
    { url: '/accounts/verfiy-session-key', methods: ['POST'], regex: 0 },
];


var api_versions = config.api_versions;
let accessAndAuthUrl = [];
let excludeJwtPaths = [];

for (let i in api_versions) {
    let accessAndAuthUrl_f = accessAndAuthUrl_base.map(item => {
        return { url: (i + item.url), methods: item.methods, regex: item.regex, pattern: item.pattern };
    })
    Array.prototype.push.apply(accessAndAuthUrl, accessAndAuthUrl_f);

    let excludeJwtPaths_f = excludeJwtPaths_base.map(item => {
        return { url: (i + item.url), methods: item.methods };
    })
    Array.prototype.push.apply(excludeJwtPaths, excludeJwtPaths_f);
}

// console.log(excludeJwtPaths)

/**
 * All routes will be register here to validate url and request method
 */
let coreUtils = new CoreUtils(),
    prefix = "/api",

    expressRoutes = [
    ],
    apiRoutes = coreUtils.parseRegisteredRoutes(expressRoutes);


/**
 * Return all routes with prefix
 */
function getRoutes() {

    return {
        prefix: prefix,
        apiRoutes: apiRoutes
    };
}



/**
 * Check route exists or not
 * @param {*} originalUrl 
 */
function routeExists(originalAPIUrl, reqMethod) {
    let originalUrl = originalAPIUrl.split('/api')[1];
    let appRoutes = getRoutes();
    const exists = lodash.find(appRoutes.apiRoutes, (route) => {
        let index = route.path.indexOf(":");
        let pathToCheck = route.path;

        if (index >= 0) {
            pathToCheck = route.path.substr(0, (index - 1));
            return ((originalUrl.indexOf(pathToCheck) >= 0) && (route.method == reqMethod));
        }
        return ((prefix + originalUrl == prefix + pathToCheck) && (route.method == reqMethod));
    });
    return exists;
}

module.exports = {
    // initRoutes: initRoutes,
    // router: router,
    getRoutes: getRoutes,
    routeExists: routeExists,
    excludeJwtPaths: excludeJwtPaths,
    accessAndAuthUrl: accessAndAuthUrl
}
