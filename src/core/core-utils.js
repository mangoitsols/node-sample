/**
 *  -------Import all classes and packages -------------
 */
import msgCodes from './message-code';
import lodash from 'lodash';
import CommonMethods from './common-methods';

export default class CoreUtils {

    constructor() { }

    wrapSequelizeValidations(error) {
        let commonMethods=new CommonMethods();
        let validationError = {
            failedValidations: []
        };
        if (error
            && error.name === "SequelizeValidationError"
            && error.errors
            && error.errors.length) {

            error.errors.forEach((error) => {
                let paths=commonMethods.toCamelCase(error.path);
                if(error.type=='notNull Violation'){
                    error.message=paths+' field is required';
                }
                validationError.failedValidations.push({
                    path: paths,
                    message: error.message
                });
            });
        }
        if (validationError.failedValidations.length) {
            return validationError;
        } else {
            return undefined;
        }
    }

    parseRegisteredRoutes(apiRoutes) {
        let routes = [];
        lodash.each(apiRoutes, (api) => {
            if (lodash.isObject(api)) {
                if (!api.stack) {
                    lodash.assign(options, api);
                } else {
                    lodash.each(api.stack, function (stack) {
                        if (stack.route) {
                            var route = stack.route,
                                methodsDone = {};
                            lodash.each(route.stack, function (r) {
                                var method = r.method ? r.method.toUpperCase() : null;
                                if (!methodsDone[method] && method) {
                                    routes.push({
                                        method: method,
                                        path: route.path,
                                        methods: route.methods,
                                        fn: r.name.replace('bound ', ''),
                                        params: r.params,
                                        keys: r.keys,
                                        regexp: r.regexp
                                    });
                                    methodsDone[method] = true;
                                }
                            });
                        }
                    });
                }
            }
        });
        return routes;
    }

}
