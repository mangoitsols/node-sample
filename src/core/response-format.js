/**
 *  -------Import all classes and packages -------------
 */
import deepmerge from 'deepmerge';
import messageCode from './message-code';
import messageList from './message-list';

import express from 'express';
let app = express();


function createResponseTemplate(code, params) {
    let template = {
        success: true,
        code: 200,
        message: "Processed",
        description: "Request has been processed successfully.",
        content: {
            dataList: null,
            messageList: null,
        }
    };
    let merged, message = undefined;

    if (code && code.length) {
        template.content.messageList = [];
        for (let i = 0; i < code.length; i++) {
            message = messageCode.messageCode(code[i]);
            template.content.messageList.push({ messageCode: code[i], messageDescription: message });
        }
    }

    if (params) {
        merged = deepmerge(template, params);
    } else {
        merged = template;
    }
    return merged;
}

function getResponseMessageByCodeList(code, params) {
    let template = {
        success: true,
        code: 200,
        message: "Processed",
        description: "OK",
        content: {
            dataList: null,
            messageList: null,
        }
    };
    let merged;
    template.content.messageList = {};
    if (code && code.length) {
        for (let i = 0; i < code.length; i++) {
            let fieldName = '', codeParams = '';
            if (code[i].indexOf(':') > -1) {
                fieldName = code[i].split(':')[0], codeParams = code[i].split(':')[1];
            } else {
                fieldName = code[i]; codeParams = code[i];
            }
            let msg = messageCode.messageCode(codeParams);
            if (template.content.messageList[fieldName]) {
                template.content.messageList[fieldName] = template.content.messageList[fieldName] + msg;
            } else {
                template.content.messageList[fieldName] = msg;
            }
        }
    }
    if (params) {
        merged = deepmerge(template, params);
        if (params.code == 400 || params.code == 401 || params.code == 404 || params.code == 417 || params.code == 500) {
            merged.success = false;
            merged.message = "Unprocessed";
        }
        if (params.code == 400) {
            merged.description = "Bad Request";
        }
        if (params.code == 401) {
            merged.description = "Unauthorized";
        }
        if (params.code == 404) {
            merged.description = "Not Found";
        }
        if (params.code == 500) {
            merged.message = "Error";
            merged.description = "Internal Server Error";
        }
        if (params.code == 417) {
            merged.message = "Processed";
            merged.description = "Expectation Failed";
        }
    } else {
        merged = template;
    }

    /**
     * replace null to empty string  from data
     */
    if (merged.content.dataList && merged.content.dataList.length) {
        // console.log('merged.content.dataList:', merged.content.dataList);
        let stringResp = JSON.stringify(merged.content.dataList).replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\"");
        //console.log('stringResp:', stringResp);
        merged.content.dataList = JSON.parse(stringResp);
        // console.log('JSON.parse(stringResp):', JSON.parse(stringResp));
    } else {
        merged.content.dataList = [];
    }
    return merged;
}

function getResponseMessageByMsgList(code, params) {
    let template = {
        success: true,
        code: 200,
        message: "Processed",
        description: "OK",
        content: {
            dataList: null,
            messageList: null,
        }
    };
    let merged;
    template.content.messageList = {};
    if (code && code.length) {
        for (let i = 0; i < code.length; i++) {
            let fieldName = '';
            fieldName = code[i].path;
            let msg = code[i].message;
            if (template.content.messageList[fieldName]) {

                template.content.messageList[fieldName] = template.content.messageList[fieldName] + msg;
            } else {
                template.content.messageList[fieldName] = msg;
            }
        }
    }
    if (params) {
        merged = deepmerge(template, params);
        if (params.code == 400 || params.code == 401 || params.code == 404 || params.code == 417 || params.code == 500) {
            merged.success = false;
            merged.message = "Unprocessed";
        }
        if (params.code == 400) {
            merged.description = "Bad Request";
        }
        if (params.code == 401) {
            merged.description = "Unauthorized";
        }
        if (params.code == 404) {
            merged.description = "Not Found";
        }
        if (params.code == 500) {
            merged.message = "Error";
            merged.description = "Internal Server Error";
        }
        if (params.code == 417) {
            merged.description = "Expectation Failed";
        }
    } else {
        merged = template;
    }
    /**
     * replace null to empty string  from data
     */
    if (merged.content.dataList && merged.content.dataList.length) {
        // console.log('merged.content.dataList:', merged.content.dataList);
        let stringResp = JSON.stringify(merged.content.dataList).replace(/null/g, "\"\"").replace(/"\"\""/g, "\"\"");
        //console.log('stringResp:', stringResp);
        merged.content.dataList = JSON.parse(stringResp);
        // console.log('JSON.parse(stringResp):', JSON.parse(stringResp));
    } else {
        merged.content.dataList = [];
    }
    return merged;
}


function getResponseMessageByCodes(code, params) {
    let template = {
        success: true,
        code: 200,
        message: "Processed",
        description: "OK",
        content: {
            dataList: null,
            messageList: null,
        }
    };


	//console.log('info',app.locals.info)
    if(app.locals.info && app.locals.info != '')
    {
        template.content['info'] = app.locals.info;
        template.content['mandatory'] = app.locals.mandatory;
    }
	

	// console.log('params', params, 'info first ',app.locals.info)
    // if(params.content && typeof params.content['info'] != undefined)
	if(params && params.content && typeof params.content['info'] != undefined)
    {     
        app.locals.info = params.content['info'];
        app.locals.mandatory = params.content['mandatory'];
    }
	
   
    let merged;
    template.content.messageList = {};
    if (code && code.length) {
        for (let i = 0; i < code.length; i++) {

            let fieldName = '', codeParams = '';
            if (code[i].indexOf('~') > -1) {
                fieldName = code[i].split('~')[0], codeParams = code[i].split('~')[1];
            }
            else if (code[i].indexOf(':') > -1) {
                fieldName = code[i].split(':')[0], codeParams = code[i].split(':')[1];
            } else {
                fieldName = code[i]; codeParams = code[i];
            }
            //let fldNm = template.content.messageList[fieldName] ? template.content.messageList[fieldName] : fieldName;
            let fldNm = template.content.messageList[fieldName] ? codeParams : fieldName;
            let codPrm = messageList.messageList[codeParams] ? messageList.messageList[codeParams] : codeParams;
            template.content.messageList[fldNm] = codPrm;
        }
    }
    if (params) {
        merged = deepmerge(template, params);
        if (params.code == 400 || params.code == 401 || params.code == 404 || params.code == 417 || params.code == 500) {
            merged.success = false;
            merged.message = "Unprocessed";
        }
        if (params.code == 400) {
            merged.description = "Bad Request";
        }
        if (params.code == 401) {
            merged.description = "Unauthorized";
        }
        if (params.code == 404) {
            merged.description = "Not Found";
        }
        if (params.code == 500) {
            merged.message = "Error";
            merged.description = "Internal Server Error";
        }
        if (params.code == 417) {
            merged.message = "Processed";
            merged.description = "Expectation Failed";
        }
    } else {
        merged = template;
    }

    /**
     * replace null to empty string  from data
     */
    if (merged.content.dataList && merged.content.dataList.length) {

        let stringResp = JSON.stringify(merged.content.dataList, (k,v) =>{
            if(v == null || v == 'null')
            {
                return '';
            }
            return v;
        })      
        merged.content.dataList = JSON.parse(stringResp);

    } else {
        merged.content.dataList = [];
    }
    return merged;
}

module.exports = {
    createResponseTemplate: createResponseTemplate,
    getResponseMessageByCodeList: getResponseMessageByCodeList,
    getResponseMessageByMsgList: getResponseMessageByMsgList,
    getResponseMessageByCodes: getResponseMessageByCodes
}